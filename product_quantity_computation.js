const { createHash } = require('crypto')
const fs = require('fs')
const os = require('os')

const inputFolder="./data/inputs";
const outputFolder="./data/outputs"

const startTime = new Date()
var fileCount = 0

async function processInput(path) {
  console.log(`Starting to look for files in ${path} to compute results...`)
  
  try {
    const files = fs.readdirSync(path)
    files.map(async (file, i) => {
      await handleFile(`${path}/${file}`)
    })
  } catch(err) {
    console.error(err)
  }
}

async function handleFile(filepath) {
  try {
    const stats = fs.statSync(filepath)
      
    if(stats.isDirectory()) {
      console.log(`Found directory at ${filepath}`)
      await processInput(filepath)
    } else {
      fileCount++
      const file = fs.readFileSync(filepath)
      const file_string = file.toString()
      printFileInfo(filepath, stats, file_string)

      console.log(`Start computing results for ${filepath}`)
      await computeResult(filepath, file_string)
    }
    
  } catch(err) {
    console.error(err)
  }
}

async function computeResult(filepath, file_string) {
  try{
    const { data } = JSON.parse(file_string)
    
    /*
    {
        "order_id": 1,
        "product_id": 1,
        "quantity": 2,
        "total_price": 20.00,
        "user_id": 1
    }
    */
    const quantities = {}
    for(const order of data.orders){
        if(!quantities[order.product_id]) quantities[order.product_id] = 0
        quantities[order.product_id] += order.quantity
    }
    
    const result = {
        [filepath]: quantities
    }

    fs.appendFileSync(`${outputFolder}/results.json`, 'Product Quantity Computation Results: \n\n')
    fs.appendFileSync(`${outputFolder}/results.json`, `${JSON.stringify(result)} \n\n`)
    
    for (let key in quantities) {
      fs.appendFileSync(`${outputFolder}/results.json`, `${quantities[key]} units of product ${key} ordered. \n`)
    }

    console.log(`Added quantities for ${filepath} to results`)
  } catch(err) {
    console.error("Could not compute given file:")
    console.error(err)
  }
}

function printFileInfo(filepath, stats, file_string) {
  console.log("\n================== FILE INFO ===================")
  console.log(`File: ${filepath}`)
  console.log(`Size: ${stats.size}B`)
  console.log(`Hash: ${createHash('sha256').update(file_string).digest('hex')}`)
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
  console.log(`Results will be written in results.json\n`)
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
  return date.toLocaleString("en-US", { hour12: false, timeZoneName: 'short' })
}

async function runAlgorithm() {
  printIntro()
  printSystemInfo()
  await processInput(inputFolder)
  printOutro()
}

runAlgorithm()
