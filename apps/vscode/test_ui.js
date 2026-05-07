const fs = require('fs');
const path = require('path');

const templatePath = 'c:\\nexa\\apps\\vscode\\extension_template.html';
const iconUri = 'https://nexa.ai/logo.svg'; // Placeholder
let html = fs.readFileSync(templatePath, 'utf8');
html = html.replace(/\${iconUri}/g, iconUri);

fs.writeFileSync('c:\\nexa\\apps\\vscode\\test_ui.html', html);
console.log('UI Test file created at c:\\nexa\\apps\\vscode\\test_ui.html');
