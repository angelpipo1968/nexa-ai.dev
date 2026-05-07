
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(process.env.APPDATA, 'Code', 'User', 'settings.json');

try {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        // Handle potential comments in JSON or empty file
        try {
            settings = JSON.parse(content);
        } catch (e) {
            console.error("Error parsing settings.json, might have comments. Trying to fix...");
            settings = JSON.parse(content.replace(/\/\/.*$/gm, ''));
        }
    }

    settings['nexa.backendUrl'] = 'http://localhost:3001';
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
    console.log("✅ SUCCESS: nexa.backendUrl updated to http://localhost:3001");
} catch (err) {
    console.error("❌ FAILED to update settings.json:", err.message);
}
