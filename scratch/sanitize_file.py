import os

path = 'c:/nexa/nexa_agente/protection_core.py'
with open(path, 'rb') as f:
    content = f.read()

# Remove null bytes
content = content.replace(b'\x00', b'')

# Convert to string and normalize indentation
text = content.decode('utf-8', errors='ignore')
lines = text.splitlines()

# Ensure class PhoenixProtocol is there if missing
if not any('class PhoenixProtocol' in line for line in lines):
    # Find where to insert it (before the first indented def __init__)
    for i, line in enumerate(lines):
        if 'def __init__(self, vault_path=None):' in line:
            lines.insert(i, 'class PhoenixProtocol:')
            break

# Re-save the file
with open(path, 'w', encoding='utf-8', newline='\n') as f:
    for line in lines:
        f.write(line.rstrip() + '\n')

print(f"Sanitized {path}")
