import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const { userData } = await req.json();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const zip = new JSZip();

    // 1. Add User Data (Chat History, Settings)
    if (userData) {
      zip.file('user-data.json', JSON.stringify(userData, null, 2));
    }

    // 2. Add Project Files (Source Code)
    const sourceDirs = ['app', 'components', 'public', 'lib', 'styles', 'utils'];
    
    const addFilesToZip = (dirPath: string, zipFolder: JSZip) => {
      if (!fs.existsSync(dirPath)) return;
      
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
            addFilesToZip(filePath, zipFolder.folder(file)!);
          }
        } else {
          const content = fs.readFileSync(filePath);
          zipFolder.file(file, content);
        }
      }
    };

    sourceDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        addFilesToZip(fullPath, zip.folder(dir)!);
      }
    });

    // Generate Zip
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = path.join(backupDir, `nexa-backup-${timestamp}.zip`);
    
    fs.writeFileSync(zipPath, content);

    // Also save a separate JSON for quick restore
    if (userData) {
        fs.writeFileSync(path.join(backupDir, 'latest-data.json'), JSON.stringify(userData, null, 2));
    }

    return NextResponse.json({ success: true, path: zipPath, timestamp });
  } catch (error: any) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
