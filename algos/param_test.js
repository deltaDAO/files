const fs = require('fs')
const path = require('path')

const input_dir = './data/inputs'

function read_params() {
    const filePath = path.join(__dirname, input_dir, 'algoCustomData.json')
    const jsonData = fs.readFileSync(filePath)
    const algoCustomData = JSON.parse(jsonData)

    const paramKeys = Object.keys(algoCustomData)
    paramKeys.forEach(key => {
        const value = algoCustomData[key]
        console.log(`Found consumer parameter: "${key}" with value: ${value} (${typeof value})`)
    })
}

read_params()