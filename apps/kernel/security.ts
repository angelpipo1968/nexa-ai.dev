/* eslint-disable */
// apps/kernel/security.ts - Cinturón de seguridad para God Mode
export enum TrustLevel {
    READ = 1,
    WRITE_SAFE = 2,
    EXECUTE = 3,
    GOD_MODE = 4
}

export const PERMISSION_RULES: Record<TrustLevel, {
    paths: RegExp[];
    commands: RegExp[];
    requiresApproval: boolean
}> = {
    [TrustLevel.READ]: {
        paths: [/^.*$/], // Todo en lectura
        commands: [/^cat$/, /^ls$/, /^grep$/],
        requiresApproval: false
    },
    [TrustLevel.WRITE_SAFE]: {
        paths: [/^\/projects\//, /^\/docs\//, /^C:\/Users\/pipog\/NEXA_/],
        commands: [/^echo$/, /^write_file$/],
        requiresApproval: true // Notificación, no bloqueo
    },
    [TrustLevel.EXECUTE]: {
        paths: [/^\/projects\//],
        commands: [/^npm$/, /^npx$/, /^python$/, /^node$/],
        requiresApproval: true // Aprobación explícita
    },
    [TrustLevel.GOD_MODE]: {
        paths: [/^.*$/],
        commands: [/^.*$/], // Todos los comandos
        requiresApproval: true // Aprobación con 2FA/biometría
    }
};

export function validatePermission(level: TrustLevel, context: { path?: string; command?: string }) {
    const rules = PERMISSION_RULES[level];

    if (context.path && !rules.paths.some(r => r.test(context.path!))) {
        return false;
    }
    if (context.command && !rules.commands.some(r => r.test(context.command!))) {
        return false;
    }

    if (rules.requiresApproval) {
        console.warn(`[SECURITY] Requiring approval for level ${level}`, context);
        alertSecurityEvent(level, context); // Enviar alerta a n8n
        return 'PENDING_APPROVAL';
    }

    return true;
}

export async function alertSecurityEvent(level: TrustLevel, context: any) {
    const webhookUrl = 'http://localhost:5678/webhook-test/nexas-security';
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'SECURITY_ALERT',
                level: TrustLevel[level],
                context,
                timestamp: new Date().toISOString()
            })
        });
    } catch (e) {
        // Fallback silencioso para no interrumpir el flujo principal
    }
}
