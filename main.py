from collections import Counter
file = open("PPN330359855X.txt", "r")
data = file.read()
print(Counter(data))