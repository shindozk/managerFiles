import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

async function unzipFile(zipFilePath) {
    try {
        // Ensure the zip file exists
        if (!fs.existsSync(zipFilePath)) {
            console.error(`Zip file not found: ${zipFilePath}`);
            return;
        }

        // Create a folder with the same name as the zip file (without the extension)
        const zipFileName = path.basename(zipFilePath, path.extname(zipFilePath));
        const extractPath = path.join(path.dirname(zipFilePath), zipFileName);

        // Create the extraction directory if it doesn't exist
        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath, { recursive: true });
        }

        // Read the zip file
        const zip = new AdmZip(zipFilePath);

        // Extract all entries to the specified directory
        zip.extractAllTo(extractPath, true);  // true overwrites existing files

        console.log(`Successfully extracted to ${extractPath}`);

    } catch (error) {
        console.error(`Error during unzipping process: ${error}`);
    }
}

async function processZipFiles(directoryPath) {
    try {
        const files = await fs.promises.readdir(directoryPath);

        for (const file of files) {
            if (file.toLowerCase().endsWith('.zip')) {
                const zipFilePath = path.join(directoryPath, file);
                await unzipFile(zipFilePath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory: ${error}`);
    }
}

// Define the target directory
const targetDirectory = path.resolve('./uploads');

// Process all zip files in the target directory
processZipFiles(targetDirectory);
