const fs = require('fs');
const path = require('path');

const sourceDirectory = '/data/inputs'
const destinationDirectory = '/data/outputs'
const newFileName = 'carbon_footprint.pdf'

let firstPdfFound = false;

function copyFirstPdf(directory) {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const absolutePath = path.join(directory, file);
        const fileStat = fs.statSync(absolutePath);

        if (fileStat.isDirectory()) {
            copyFirstPdf(absolutePath); // recursion
        } else if (file === '0' && !firstPdfFound) {
            const destinationFile = path.join(destinationDirectory, newFileName);
            fs.copyFileSync(absolutePath, destinationFile);
            console.log(`Successfully created ${destinationFile}`);
            firstPdfFound = true;
            break;
        }
    }
}

try {
    copyFirstPdf(sourceDirectory);
} catch (err) {
    console.error('An error occurred:', err);
}
