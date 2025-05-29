// app.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import archiver from 'archiver';

// Define __dirname para compatibilidade com módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // A raiz do seu projeto

const app = express();
const port = 3000;

// --- Configuração do Multer para upload de arquivos ---
const uploadDir = path.join(__dirname, 'uploads');

// Garante que o diretório 'uploads' exista
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Salva na pasta 'uploads'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- Middleware para servir arquivos estáticos ---
// A pasta 'public' (se você tiver) e a pasta 'uploads'
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir)); // Serve os arquivos da pasta 'uploads'

// Middleware para processar JSON no corpo das requisições (para a rota de compactação)
app.use(express.json());

// --- Rota para a página de upload (upload.html) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

// --- Rota para a página de compactação (compact.html) ---
app.get('/compact-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'compact.html'));
});

// --- Rota para lidar com o upload de arquivos ---
app.post('/upload', upload.array('files', 10), (req, res) => {
  if (req.files && req.files.length > 0) {
    const uploadedFileNames = req.files.map(file => file.filename);
    res.status(200).json({
      message: 'Uploads realizados com sucesso!',
      files: uploadedFileNames,
      paths: req.files.map(file => path.relative(__dirname, file.path))
    });
  } else {
    res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
});

// --- Função para construir a estrutura de arquivos recursivamente ---
// Ignora 'node_modules', '.git', e qualquer arquivo/pasta oculto
const ignoredPaths = ['node_modules', '.git', 'uploads']; // Adicionado 'uploads' para evitar listar duas vezes ou recursão
const buildFileTree = async (currentPath, relativePath = '') => {
    const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true });
    const items = [];

    for (const dirent of dirents) {
        // Ignora pastas e arquivos na lista de ignorados, e arquivos/pastas ocultos
        if (ignoredPaths.includes(dirent.name) || dirent.name.startsWith('.')) {
            continue;
        }

        const itemFullPath = path.join(currentPath, dirent.name);
        const itemRelativePath = path.join(relativePath, dirent.name);

        if (dirent.isFile()) {
            const stats = await fs.promises.stat(itemFullPath);
            items.push({
                name: dirent.name,
                path: itemRelativePath, // Caminho relativo da raiz do projeto
                type: 'file',
                size: stats.size
            });
        } else if (dirent.isDirectory()) {
            const children = await buildFileTree(itemFullPath, itemRelativePath);
            items.push({
                name: dirent.name,
                path: itemRelativePath,
                type: 'folder',
                children: children
            });
        }
    }
    return items;
};


// --- Rota para listar arquivos e pastas do projeto (como um 'ls' recursivo) ---
// Retorna a estrutura para o front-end
app.get('/api/project-structure', async (req, res) => {
    try {
        const projectStructure = await buildFileTree(__dirname, ''); // Começa da raiz do projeto
        console.log('--- Estrutura do Projeto Encontrada (Log do Servidor) ---');
        console.log(JSON.stringify(projectStructure, null, 2)); // Log para depuração
        console.log('---------------------------------------------------------');
        res.json(projectStructure);

    } catch (error) {
        console.error('Erro ao construir a estrutura do projeto:', error);
        res.status(500).json({ message: 'Erro ao listar a estrutura do projeto.' });
    }
});

// --- Rota para Compactar Arquivos e Pastas no Servidor ---
app.post('/api/create-zip', (req, res) => {
    const selectedItems = req.body.items; // Lista de caminhos relativos selecionados do front-end
    const zipName = req.body.zipName || 'compactados.zip';
    const compressionLevel = req.body.compressionLevel || 5;

    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
        return res.status(400).json({ message: 'Nenhum item selecionado para compactar.' });
    }

    const archive = archiver('zip', {
        zlib: { level: compressionLevel }
    });

    res.attachment(zipName);
    archive.pipe(res);

    archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
            console.warn('Erro de arquivo não encontrado (aviso do archiver):', err.message);
        } else {
            throw err;
        }
    });

    archive.on('error', function(err) {
        console.error('Erro ao criar o ZIP (archiver):', err);
        res.status(500).send({ message: 'Erro ao criar o arquivo ZIP: ' + err.message });
    });

    // Adiciona os itens selecionados ao arquivo ZIP
    selectedItems.forEach(itemPath => {
        // Usa path.join(__dirname, itemPath) para obter o caminho completo no sistema de arquivos
        // 'itemPath' já vem relativo à raiz do projeto ('__dirname') do front-end
        const fullPath = path.join(__dirname, itemPath); 

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isFile()) {
                // Adiciona um arquivo, usando 'itemPath' para manter a estrutura relativa dentro do ZIP
                archive.file(fullPath, { name: itemPath });
            } else if (stats.isDirectory()) {
                // Adiciona uma pasta e todo o seu conteúdo recursivamente
                // O segundo argumento de directory() é o caminho relativo dentro do ZIP
                archive.directory(fullPath, itemPath);
            }
        } else {
            console.warn(`Item não encontrado para compactação: ${fullPath}`);
        }
    });

    archive.finalize();
});


// --- Inicia o servidor ---
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Página de upload: http://localhost:${port}`);
  console.log(`Página de compactação: http://localhost:${port}/compact-page`);
});
