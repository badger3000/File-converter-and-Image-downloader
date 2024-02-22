// Assuming the script is now an ES module (e.g., script.mjs or .js with "type": "module" in package.json)

import csvTojson from 'csvtojson';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const csvFilePath = path.join(__dirname, 'products.csv');
const outputJsonPath = path.join(__dirname, 'output.json');
const imageFields = ['o_PRIMARY_IMAGE1', 'o_PRIMARY_IMAGE2', 'o_PRIMARY_IMAGE3', 'o_PRIMARY_IMAGE4'];

const downloadImage = async (url, outputPath) => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const buffer = await response.buffer();
      fs.writeFileSync(outputPath, buffer);
      console.log(`Downloaded image to ${outputPath}`);
    } else {
      console.error(`Failed to download ${url}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
  }
};

const startConversionAndDownload = async () => {
  try {
    const jsonObj = await csvTojson().fromFile(csvFilePath);
    for (const item of jsonObj) {
      for (const field of imageFields) {
        const url = item[field];
        if (url) {
          const filename = path.basename(new URL(url).pathname);
          const outputPath = path.join(__dirname, 'images', filename);

          // Ensure the 'images' directory exists
          fs.mkdirSync(path.join(__dirname, 'images'), { recursive: true });

          await downloadImage(url, outputPath);
        }
      }
    }

    // Optionally, write the JSON to a file
    fs.writeFileSync(outputJsonPath, JSON.stringify(jsonObj, null, 2), 'utf-8');
    console.log(`JSON saved to ${outputJsonPath}`);
  } catch (error) {
    console.error('Error during conversion or image download:', error);
  }
};

startConversionAndDownload();
