import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ═══════════════════════════════════════════
//  Ruta base en disco C:
// ═══════════════════════════════════════════

const NEXA_DATA_DIR = 'C:\\NEXA-Data';

// Crear directorio si no existe
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[NEXA] Directorio creado: ${dir}`);
    }
}

ensureDir(NEXA_DATA_DIR);
ensureDir(path.join(NEXA_DATA_DIR, 'conversations'));
ensureDir(path.join(NEXA_DATA_DIR, 'messages'));
ensureDir(path.join(NEXA_DATA_DIR, 'files'));
ensureDir(path.join(NEXA_DATA_DIR, 'backups'));

// ═══════════════════════════════════════════
//  CONVERSACIONES
// ═══════════════════════════════════════════

// Guardar conversación
app.post('/api/local/conversations', (req, res) => {
    const { id, title, user_id } = req.body;
    const convPath = path.join(NEXA_DATA_DIR, 'conversations', `${id}.json`);

    const conversation = {
        id,
        title: title || 'Nueva conversación',
        user_id: user_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(convPath, JSON.stringify(conversation, null, 2));
    console.log(`[NEXA] Conversación guardada: ${id}`);
    res.json(conversation);
});

// Listar conversaciones
app.get('/api/local/conversations', (_req, res) => {
    const convDir = path.join(NEXA_DATA_DIR, 'conversations');
    const files = fs.readdirSync(convDir).filter((f) => f.endsWith('.json'));

    const conversations = files
        .map((f) => {
            const data = fs.readFileSync(path.join(convDir, f), 'utf-8');
            return JSON.parse(data);
        })
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    res.json(conversations);
});

// Eliminar conversación
app.delete('/api/local/conversations/:id', (req, res) => {
    const { id } = req.params;
    const convPath = path.join(NEXA_DATA_DIR, 'conversations', `${id}.json`);
    const msgDir = path.join(NEXA_DATA_DIR, 'messages', id);

    if (fs.existsSync(convPath)) fs.unlinkSync(convPath);
    if (fs.existsSync(msgDir)) fs.rmSync(msgDir, { recursive: true });

    console.log(`[NEXA] Conversación eliminada: ${id}`);
    res.json({ success: true });
});

// ═══════════════════════════════════════════
//  MENSAJES
// ═══════════════════════════════════════════

// Guardar mensaje
app.post('/api/local/messages', (req, res) => {
    const { conversation_id, role, content, id: msgId } = req.body;
    const msgDir = path.join(NEXA_DATA_DIR, 'messages', conversation_id);
    ensureDir(msgDir);

    const message = {
        id: msgId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversation_id,
        role,
        content,
        created_at: new Date().toISOString(),
    };

    const msgPath = path.join(msgDir, `${message.id}.json`);
    fs.writeFileSync(msgPath, JSON.stringify(message, null, 2));
    res.json(message);
});

// Obtener mensajes de una conversación
app.get('/api/local/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const msgDir = path.join(NEXA_DATA_DIR, 'messages', conversationId);

    if (!fs.existsSync(msgDir)) {
        return res.json([]);
    }

    const files = fs.readdirSync(msgDir).filter((f) => f.endsWith('.json'));
    const messages = files
        .map((f) => {
            const data = fs.readFileSync(path.join(msgDir, f), 'utf-8');
            return JSON.parse(data);
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    res.json(messages);
});

// ═══════════════════════════════════════════
//  ARCHIVOS (imágenes, documentos, etc.)
// ═══════════════════════════════════════════

app.post('/api/local/files', (req, res) => {
    const { name, data, conversation_id } = req.body;
    const fileDir = path.join(NEXA_DATA_DIR, 'files', conversation_id || 'general');
    ensureDir(fileDir);

    const filePath = path.join(fileDir, name);
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`[NEXA] Archivo guardado: ${name} (${buffer.length} bytes)`);
    res.json({ success: true, path: filePath, size: buffer.length });
});

// ═══════════════════════════════════════════
//  BACKUP (exportar todo)
// ═══════════════════════════════════════════

app.post('/api/local/backup', (_req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(NEXA_DATA_DIR, 'backups', `backup-${timestamp}`);
    ensureDir(backupDir);

    // Copiar conversaciones
    const convDir = path.join(NEXA_DATA_DIR, 'conversations');
    const msgDir = path.join(NEXA_DATA_DIR, 'messages');

    const backupConvDir = path.join(backupDir, 'conversations');
    const backupMsgDir = path.join(backupDir, 'messages');

    ensureDir(backupConvDir);
    ensureDir(backupMsgDir);

    // Copiar archivos
    if (fs.existsSync(convDir)) {
        for (const f of fs.readdirSync(convDir)) {
            fs.copyFileSync(path.join(convDir, f), path.join(backupConvDir, f));
        }
    }

    if (fs.existsSync(msgDir)) {
        for (const conv of fs.readdirSync(msgDir)) {
            const convBackupDir = path.join(backupMsgDir, conv);
            ensureDir(convBackupDir);
            for (const f of fs.readdirSync(path.join(msgDir, conv))) {
                fs.copyFileSync(
                    path.join(msgDir, conv, f),
                    path.join(convBackupDir, f)
                );
            }
        }
    }

    console.log(`[NEXA] Backup creado: ${backupDir}`);
    res.json({ success: true, path: backupDir });
});

// ═══════════════════════════════════════════
//  ESTADÍSTICAS
// ═══════════════════════════════════════════

app.get('/api/local/stats', (_req, res) => {
    const convDir = path.join(NEXA_DATA_DIR, 'conversations');
    const msgDir = path.join(NEXA_DATA_DIR, 'messages');
    const backupDir = path.join(NEXA_DATA_DIR, 'backups');

    const convCount = fs.existsSync(convDir)
        ? fs.readdirSync(convDir).filter((f) => f.endsWith('.json')).length
        : 0;

    let msgCount = 0;
    if (fs.existsSync(msgDir)) {
        for (const conv of fs.readdirSync(msgDir)) {
            msgCount += fs.readdirSync(path.join(msgDir, conv)).length;
        }
    }

    const backupCount = fs.existsSync(backupDir)
        ? fs.readdirSync(backupDir).length
        : 0;

    // Tamaño total
    function getDirSize(dir: string): number {
        if (!fs.existsSync(dir)) return 0;
        let size = 0;
        for (const f of fs.readdirSync(dir)) {
            const fp = path.join(dir, f);
            const stat = fs.statSync(fp);
            if (stat.isDirectory()) {
                size += getDirSize(fp);
            } else {
                size += stat.size;
            }
        }
        return size;
    }

    const totalSize = getDirSize(NEXA_DATA_DIR);

    res.json({
        conversations: convCount,
        messages: msgCount,
        backups: backupCount,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        dataPath: NEXA_DATA_DIR,
    });
});

// ═══════════════════════════════════════════
//  INICIAR SERVIDOR
// ═══════════════════════════════════════════

const PORT = 3001;
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║     💾 NEXA Local Storage Server     ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  Puerto: ${PORT}                         ║`);
    console.log(`║  Datos:  ${NEXA_DATA_DIR}  ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');
});
