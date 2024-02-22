import csvTojson from 'csvtojson';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises'; // Ensure Node.js version is >=15

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvFilePath = path.join(__dirname, 'products.csv');
const outputJsonPath = path.join(__dirname, 'output.json');
const imageFields = ['o_PRIMARY_IMAGE1', 'o_PRIMARY_IMAGE2', 'o_PRIMARY_IMAGE3', 'o_PRIMARY_IMAGE4'];

const downloadedImages = new Set();
const processedUrls = new Set();

const downloadImage = async (url, outputPath, attempt = 1) => {
  const maxAttempts = 3; // Maximum number of retry attempts
  const timeoutDuration = 5000; // Timeout duration in milliseconds

  if (processedUrls.has(url)) {
    console.log(`URL already processed, skipping download: ${url}`);
    return;
  }
  processedUrls.add(url);

  try {
    const controller = new AbortController(); // For setting fetch timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId); // Clear the timeout if the request completes in time

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Downloaded image to ${outputPath}`);
    } else {
      console.error(`Failed to download ${url}: ${response.statusText}`);
    }
  } catch (error) {
    if (attempt < maxAttempts) {
      console.log(`Attempt ${attempt} failed for ${url}, retrying...`);
      await setTimeout(1000 * attempt); // Exponential back-off
      await downloadImage(url, outputPath, attempt + 1);
    } else {
      console.error(`Error downloading image from ${url} after ${maxAttempts} attempts:`, error.message);
    }
  }
};

const generateUniqueFilePath = (originalPath) => {
  let uniquePath = originalPath;
  let counter = 1;
  while (downloadedImages.has(uniquePath)) {
    const { dir, name, ext } = path.parse(originalPath);
    uniquePath = path.join(dir, `${name}_${Date.now()}_${counter}${ext}`);
    counter++;
  }
  downloadedImages.add(uniquePath);
  return uniquePath;
};

const startConversionAndDownload = async () => {
  const jsonObj = await csvTojson().fromFile(csvFilePath);
  const downloadPromises = [];

  jsonObj.forEach(item => {
    imageFields.forEach(field => {
      const url = item[field];
      if (url && !processedUrls.has(url)) {
        const filename = path.basename(new URL(url).pathname);
        const outputPath = path.join(__dirname, 'images', filename);

        // Ensure the 'images' directory exists
        fs.mkdirSync(path.join(__dirname, 'images'), { recursive: true });

        // Generate a unique file path for the image
        const uniqueOutputPath = generateUniqueFilePath(outputPath);

        downloadPromises.push(downloadImage(url, uniqueOutputPath));
      }
    });
  });

  await Promise.all(downloadPromises);
  fs.writeFileSync(outputJsonPath, JSON.stringify(jsonObj, null, 2), 'utf-8');
  console.log(`JSON saved to ${outputJsonPath}`);
};

startConversionAndDownload().catch(console.error);
