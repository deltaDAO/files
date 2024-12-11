const fs = require('fs');
const path = require('path');

// Path to the ddos directory
const ddosDir = '/data/ddos/';

if (fs.existsSync(ddosDir)) {
    // List all files in the directory
    const files = fs.readdirSync(ddosDir);
    console.log(`Files in ${ddosDir}:`, files);

    // Process each file in the directory
    files.forEach((file) => {
        const filePath = path.join(ddosDir, file);

        // Ensure it's a file before trying to read it
        if (fs.lstatSync(filePath).isFile()) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`Content of ${filePath}:`, content);
            } catch (err) {
                console.error(`Error reading file ${filePath}:`, err);
            }
        }
    });
} else {
    console.error(`Directory ${ddosDir} does not exist.`);
}
