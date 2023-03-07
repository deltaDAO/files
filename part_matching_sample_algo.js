const fs = require('fs')
const os = require('os')

const inputFolder="./data/inputs"
const outputFolder="./data/outputs"

const resultFileName="model"

const startTime = new Date()
var fileCount = 0

async function processInput(path) {
  console.log(`Starting to look for files in ${path} to compute results...`)
  
  const customData = getCustomData()

  try {
    const files = fs.readdirSync(path)
    
    console.log("files", files)

    const promises = files.map(async (file) => {
      const result = await handleFile(`${path}/${file}`, customData)
      if(result)
        return {
          [file]: result
        }
    })

    const results = await Promise.all(promises)

    return results
  } catch(err) {
    console.error(err)
  }
}

function getCustomData() {
  try {
  const file = fs.readFileSync(`${inputFolder}/algoCustomData.json`)
  const data = JSON.parse(file)
  return data
  } catch(e) {
    console.error(e)
    console.log("Could not read custom data")
  }
}

async function handleFile(filepath, custom_data = null) {
  try {
    const stats = fs.statSync(filepath)
      
    if(stats.isDirectory()) {
      console.log(`Found directory at ${filepath}`)
      return await processInput(filepath)
    } else {
      fileCount++
      const file = fs.readFileSync(filepath)
      const file_string = file.toString()
      printFileInfo(filepath, stats, file_string)

      console.log(`Start computing results for ${filepath}`)
      const result = await computeResult(filepath, file_string, custom_data)
      console.log(`Result for ${filepath}`, result)
      
      if(result) return result
    }
    
  } catch(err) {
    console.error(err)
  }
}

async function computeResult(filepath, file_string, custom_data = null) {
  try{
    const data = JSON.parse(file_string)
    const minWinScore = 0.9
    const maxWinScore = 1.0

    if(custom_data)
      console.log("custom data", custom_data)

    const randomItem = data[Math.floor(Math.random() * data.length)]
    
    const score = {
      SerialNumber: randomItem.SerialNumber,
      Score: (Math.random() * (maxWinScore - minWinScore) + minWinScore).toFixed(4),
      Vendor: randomItem.Vendor,
    }

    return score
  } catch(err) {
    console.error("Could not compute given file:")
    console.error(err)
  }
}

function printFileInfo(filepath, stats) {
  console.log("\n================== FILE INFO ===================")
  console.log(`File: ${filepath}`)
  console.log(`Size: ${stats.size}B`)
  console.log("=================================================\n")
}

function printIntro() {
  console.log("=================================================")
  console.log("***  This demo algorithm is brought to you by ***")
  console.log("          _      _ _        ____    _    ___  ")
  console.log("       __| | ___| | |_ __ _|  _ \\  / \\  / _ \\  ")
  console.log("      / _` |/ _ \\ | __/ _` | | | |/ _ \\| | | | ")
  console.log("     | (_| |  __/ | || (_| | |_| / ___ \\ |_| | ")
  console.log("      \\__,_|\\___|_|\\__\\__,_|____/_/   \\_\\___/  \n")  
  console.log("                       ***\n")   
  console.log("                  delta-dao.com\n")   
  console.log("                       ***\n")
  console.log("=================================================")
  console.log(`Results will be written in ${outputFolder}/${resultFileName}\n`)
}

function printOutro() {
  const endTime = new Date()
  console.log("\n============== ALGORITHM FINISHED ===============")
  console.log(`End Time:        ${printableDate(endTime)}`)
  console.log(`Execution Time:  ${endTime - startTime}ms`)
  console.log(`# of Files:      ${fileCount}`)
  console.log("=================================================\n")
}

function printSystemInfo() {
  console.log("\n================== SYSTEM INFO ==================")
  console.log(`Start Time:  ${printableDate(startTime)}`)
  console.log(`OS:`)
  console.log(`- Name:      ${os.hostname()}`)
  console.log(`- Type:      ${os.type()}`)
  console.log(`- Version:   ${os.version()}`)
  console.log(`- Memory:    ${Math.round(os.totalmem() / (1024*1024*1024) * 100) / 100}GB`)
  console.log("=================================================\n")
}

function printableDate(_date) {
  const date = new Date(_date)
  return date.toLocaleString("de-DE", { hour12: false, timeZoneName: 'short' })
}

async function runAlgorithm() {
  printIntro()
  printSystemInfo()
  const results = await processInput(inputFolder)
  
  // clean undefined entries
  results.map((result, index) => {
    if(result === undefined || Object.values(result)[0] === undefined)
      results.splice(index, 1)
  })
  
  fs.writeFileSync(`${outputFolder}/${resultFileName}`, JSON.stringify(results))
  console.log(`Wrote results to ${outputFolder}/${resultFileName}`)
  printOutro()
}

runAlgorithm()
