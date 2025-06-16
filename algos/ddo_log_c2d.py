import os

# Define the directory path
directory_path = '/data/ddos'

# Check if the directory exists
if not os.path.isdir(directory_path):
    print(f"Directory '{directory_path}' does not exist.")
else:
    # Iterate through all files in the directory
    for filename in os.listdir(directory_path):
        file_path = os.path.join(directory_path, filename)

        # Check if it's a file (not a directory)
        if os.path.isfile(file_path):
            print(f"\n--- Content of {filename} ---")
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                    content = file.read()
                    print(content)
            except Exception as e:
                print(f"Error reading {filename}: {e}")
