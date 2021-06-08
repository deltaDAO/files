const { createHash } = require('crypto')
const fs = require('fs')
const os = require('os')

const inputFolder="/data/inputs";
const outputFolder="/data/outputs"

const startTime = new Date()
var fileCount = 0

async function processInput(path) {
  console.log(`Starting to look for files in ${path} to count rows...`)
  
  try {
    const files = fs.readdirSync(path)
    files.map(async (file, i) => {
      await handleFile(`${path}/${file}`)
    })
  } catch(err) {
    console.error(err)
  }
}

async function handleFile(filepath){
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

      console.log(`Start counting lines for ${filepath}`)
      await countLines(filepath, file_string)
    }
    
  } catch(err) {
    console.error(err)
  }
}

async function countLines(filepath, file_string){
  try{
    const num_rows = file_string.split("\n").length - 1
      
    fs.appendFileSync(`${outputFolder}/results.txt`, `The file ${filepath} contains ${num_rows} rows.\n`)
    console.log(`Added row count for ${filepath} to results`);
  } catch(err) {
    console.error(err)
  }
}

function printFileInfo(filepath, stats, file_string) {
  console.log("\n================== FILLE INFO ===================")
  console.log(`File: ${filepath}`)
  //convert size to MB
  console.log(`Size: ${stats.size}B`)
  console.log(`Hash: ${createHash('sha256').update(file_string).digest('hex')}`)
  console.log("=================================================\n")
}

function printIntro(){
  console.log(fs.readFileSync('.banner').toString())
  console.log(`Find the results in ${outputFolder}/results.txt\n`)
}
function printOutro(){
  const endTime = new Date()
  console.log("\n============== ALGORITHM FINISHED ===============")
  console.log(`End Time:        ${printableDate(endTime)}`)
  console.log(`Execution Time:  ${endTime - startTime}ms`)
  console.log(`# of Files:      ${fileCount}`)
  console.log("=================================================\n")
}

function printSystemInfo(){
  console.log("\n================== SYSTEM INFO ==================")
  console.log(`Start Time:  ${printableDate(startTime)}`)
  console.log(`OS:`)
  console.log(`- Name:      ${os.hostname()}`)
  console.log(`- Type:      ${os.type()}`)
  console.log(`- Version:   ${os.version()}`)
  console.log(`- Memory:    ${Math.round(os.totalmem() / (1024*1024*1024) * 100) / 100}GB`)
  console.log(`- CPU's:`)
  os.cpus().map(cpu => {
    console.log(`   * ${cpu.model}`)
  })
  console.log("=================================================\n")
}

function printableDate(_date){
  const date = new Date(_date)
  return date.toLocaleString("en-US", { hour12: false, timeZoneName: 'short' })
}

async function runAlgorithm(){
  printIntro()
  printSystemInfo()
  await processInput(inputFolder)
  printOutro()
}

runAlgorithm()