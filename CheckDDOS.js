const fs = require('fs');
const path = require('path');

// Read the TRANSFORMATION_DID from the environment
const TRANSFORMATION_DID = process.env.TRANSFORMATION_DID;

if (!TRANSFORMATION_DID) {
    console.error('TRANSFORMATION_DID is not set in the environment.');
    process.exit(1);
}

// Path to the JSON file for the TRANSFORMATION_DID
const transformationDIDPath = `/data/ddos/${TRANSFORMATION_DID}.json`;

// Read the transformation DID JSON file
if (fs.existsSync(transformationDIDPath)) {
    const transformationDIDContent = fs.readFileSync(transformationDIDPath, 'utf8');
    console.log(`Content of ${transformationDIDPath}:`, transformationDIDContent);
} else {
    console.error(`File ${transformationDIDPath} does not exist.`);
}

// Assuming the DIDS JSON file exists in the environment or a specific path
const didsFilePath = '/data/inputs/dids.json';

if (fs.existsSync(didsFilePath)) {
    const didsContent = fs.readFileSync(didsFilePath, 'utf8');
    const dids = JSON.parse(didsContent);

    if (Array.isArray(dids) && dids.length > 0) {
        const firstDID = dids[0];
        console.log(`First DID: ${firstDID}`);

        // Path to the JSON file for the first DID
        const firstDIDPath = `/data/ddos/${firstDID}.json`;

        if (fs.existsSync(firstDIDPath)) {
            const firstDIDContent = fs.readFileSync(firstDIDPath, 'utf8');
            console.log(`Content of ${firstDIDPath}:`, firstDIDContent);
        } else {
            console.error(`File ${firstDIDPath} does not exist.`);
        }
    } else {
        console.error('No DIDs found in the file.');
    }
} else {
    console.error(`File ${didsFilePath} does not exist.`);
}

// List all files in /data/ddos/
const ddosDir = '/data/ddos/';

if (fs.existsSync(ddosDir)) {
    const files = fs.readdirSync(ddosDir);
    console.log(`Files in ${ddosDir}:`, files);
} else {
    console.error(`Directory ${ddosDir} does not exist.`);
}
