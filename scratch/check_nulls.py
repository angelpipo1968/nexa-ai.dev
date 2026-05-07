import os

files_to_check = [
    'c:/nexa/main.py',
    'c:/nexa/nexa_agente/protection_core.py',
    'c:/nexa/nexa_agente/__init__.py'
]

for file_path in files_to_check:
    if os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            content = f.read()
            null_count = content.count(b'\x00')
            print(f"{file_path}: {null_count} null bytes")
    else:
        print(f"{file_path}: File not found")
