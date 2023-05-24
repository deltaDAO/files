const fs = require('fs')
const path = require('path')

const sourceDirectory = '/data/inputs'
const resultDirectory = '/data/outputs'

async function findJsonInput(directory) {
  try {
    const files = await fs.promises.readdir(directory)

    for (const file of files) {
      const absolutePath = path.join(directory, file)
      const fileStat = await fs.promises.stat(absolutePath)

      if (fileStat.isDirectory()) {
        const chargingSports = await findJsonInput(absolutePath) // recursion
        if (chargingSports) return chargingSports
      } else if (file === '0') {
        const data = await fs.promises.readFile(absolutePath, 'utf8')

        if (!isValidJson(data)) {
          console.log(`The ${absolutePath} is not in JSON format.`)
          continue
        }
        const chargingSpots = JSON.parse(data)
        return chargingSpots
      }
    }
  } catch (err) {
    console.error(err)
  }
}

function isValidJson(jsonString) {
  try {
    JSON.parse(jsonString)
    return true
  } catch (e) {
    return false
  }
}

async function writeResults(results) {
  console.log(`Writing results...`)
  try {
    fs.writeFileSync(
      `${resultDirectory}/results.json`,
      JSON.stringify(results, null, 2)
    )
    console.log(`Written results to ${resultDirectory}/results.json`)
  } catch (err) {
    console.error(err)
  }
}

async function main() {
  const result = {}
  const chargingSpots = await findJsonInput(sourceDirectory)
  if (!chargingSpots || !Array.isArray(chargingSpots))
    throw new Error('Data input is incompatible.')
  result.entityTypeFilter = 'EVChargingSpot'
  result.totalChargingSpots = chargingSpots.length
  result.occupiedChargingSpots = chargingSpots.filter(
    (chargingSpot) => chargingSpot.isSpotOccupied === true
  ).length
  result.activeChargingProcesses = chargingSpots.filter(
    (chargingSpot) => chargingSpot.isCharging === true
  ).length
  result.occupiedSockets = chargingSpots.filter(
    (chargingSpot) => chargingSpot.isSocketOccupied === true
  ).length
  result.freeChargingSpots =
    result.totalChargingSpots - result.occupiedChargingSpots

  writeResults(result)
}

try {
  console.log('Starting...')
  main()
} catch (err) {
  console.error('An error occurred:', err)
}
