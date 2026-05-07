import os

files = [
    'c:/nexa/main.py',
    'c:/nexa/nexa_agente/__init__.py',
    'c:/nexa/nexa_agente/protection_core.py'
]

for path in files:
    if os.path.exists(path):
        with open(path, 'rb') as f:
            content = f.read()
        content = content.replace(b'\x00', b'')
        text = content.decode('utf-8', errors='ignore')
        lines = text.splitlines()
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            for line in lines:
                f.write(line.rstrip() + '\n')
        print(f"Sanitized {path}")
