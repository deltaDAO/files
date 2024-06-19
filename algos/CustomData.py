#!/bin/python3
import os 

print("Data Inputs: ", os.listdir('/data/inputs'))
print("Files in / : ", os.listdir('/'))
print("Files in /data : ", os.listdir('/data'))
print("Files in /data/outputs : ", os.listdir('/data/outputs'))

try:
  with open('/data/inputs/algoCustomData.json', 'r') as f:
      print(f.read())
except:
  print("File not found")
