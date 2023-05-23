const fs = require('fs')
const path = require('path')

/*
  Copy and rename the first pdf found in the input folder
*/

const sourceDirectory = '/data/inputs' // replace with your source directory
const destinationDirectory = '/data/outputs' // replace with your destination directory
const newFileName = 'carbon_footprint.pdf'

let files
try {
  files = fs.readdirSync(sourceDirectory)
} catch (err) {
  console.error('An error occurred:', err)
  return
}

// copy first pdf
for (const file of files) {
  if (path.extname(file) === '.pdf') {
    const sourceFile = path.join(sourceDirectory, file)
    const destinationFile = path.join(destinationDirectory, newFileName)

    try {
      fs.copyFileSync(sourceFile, destinationFile)
      console.log(`Successfully created ${destinationFile}`)
    } catch (err) {
      console.error(`Error occurred while creating ${destinationFile}`, err)
    }

    break
  }
}
