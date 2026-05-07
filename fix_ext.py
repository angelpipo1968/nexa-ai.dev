import os

path = r'c:\nexa\apps\vscode\extension.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r"c:\nexaextension", r"c:\nexa\extension")
content = content.replace(r"c:\nexa\scriptscapture", r"c:\nexa\scripts\capture")
content = content.replace(r"c:\nexa\tempscreen", r"c:\nexa\temp\screen")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
