// app.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer'; // Importe o multer

// Define __dirname para compatibilidade com módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Configuração do Multer para armazenamento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define o diretório onde os arquivos serão salvos.
    // path.join(__dirname, 'uploads') vai criar uma pasta 'uploads'
    // na raiz do seu projeto.
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    // Define o nome do arquivo no disco.
    // Aqui, estamos usando o nome original do arquivo com um timestamp
    // para evitar conflitos de nomes.
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Middleware Multer para uploads.
// 'upload' é a instância do Multer.
const upload = multer({ storage: storage });

// Cria a pasta 'uploads' se ela não existir
// Este é um bom lugar para criar a pasta, logo que o app inicializa.
import fs from 'fs';
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


// Serve arquivos estáticos da pasta 'public' (se ela existir)
app.use(express.static(path.join(__dirname, 'public')));

// Serve o index.html na raiz do projeto
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'upweb.html'));
});

// --- Rota para o upload de arquivos ---
// 'upload.array('projectFiles', 100)' significa que esperamos um array de arquivos
// onde o nome do campo de entrada no formulário (ou FormData) será 'projectFiles'.
// O '100' é o limite máximo de arquivos que podem ser enviados de uma vez.
app.post('/upload', upload.array('projectFiles'), (req, res) => {
  if (req.files && req.files.length > 0) {
    console.log('Arquivos recebidos:', req.files);
    const uploadedFileNames = req.files.map(file => file.originalname);
    res.status(200).json({
      message: 'Uploads realizados com sucesso!',
      files: uploadedFileNames,
      paths: req.files.map(file => file.path) // Retorna os caminhos salvos
    });
  } else {
    res.status(400).json({ message: 'Nenhum arquivo enviado.' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Acesse http://localhost:3000 no seu navegador.');
});
