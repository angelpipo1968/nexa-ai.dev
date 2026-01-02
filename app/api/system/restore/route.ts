import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    const latestDataPath = path.join(backupDir, 'latest-data.json');

    if (fs.existsSync(latestDataPath)) {
      const data = fs.readFileSync(latestDataPath, 'utf-8');
      return NextResponse.json({ success: true, data: JSON.parse(data) });
    }

    return NextResponse.json({ success: false, message: 'No backup found' });
  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
