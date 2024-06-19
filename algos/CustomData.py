#!/bin/python3
import os 

print("Data Inputs: ", os.listdir('/data/inputs'))

try:
  with open('/data/inputs/algoCustomData.json', 'r') as f:
      print(f.read())
except:
  print("File not found")
