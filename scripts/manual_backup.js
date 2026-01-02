const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const zip = new JSZip();
  const sourceDirs = ['app', 'components', 'public', 'lib', 'styles', 'utils', 'scripts', 'android'];
  const rootFiles = ['package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.ts', 'postcss.config.js', '.eslintrc.json', 'GUIA_ANDROID.md', 'NEXA_OS_ANDROID.apk'];

  console.log('Iniciando backup...');

  // Add root files
  rootFiles.forEach(file => {
    if (fs.existsSync(file)) {
      zip.file(file, fs.readFileSync(file));
    }
  });

  // Add directories
  const addFilesToZip = (dirPath, zipFolder) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
          addFilesToZip(filePath, zipFolder.folder(file));
        }
      } else {
        zipFolder.file(file, fs.readFileSync(filePath));
      }
    }
  };

  sourceDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      addFilesToZip(fullPath, zip.folder(dir));
    }
  });

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const zipPath = path.join(backupDir, `manual-backup-${timestamp}.zip`);
  fs.writeFileSync(zipPath, content);
  
  console.log(`Backup creado exitosamente en: ${zipPath}`);
}

createBackup().catch(console.error);
