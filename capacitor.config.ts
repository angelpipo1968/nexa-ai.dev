import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexa.ai',
    appName: 'NEXA AI',
    webDir: 'out',
    server: {
        url: 'https://nexa-ai.dev/',
        cleartext: true,
        androidScheme: 'https',
    },
    android: {
        buildOptions: {
            keystorePath: undefined,
            keystoreAlias: undefined,
        },
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: false,              // Control manual
            launchShowDuration: 3000,           // 3 segundos
            backgroundColor: '#0a0a0a',
            showSpinner: false,
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'DARK' as any,
            backgroundColor: '#0a0a0a',
        },
        Keyboard: {
            resize: 'body' as any,
            style: 'DARK' as any,
        },
    },
};

export default config;
