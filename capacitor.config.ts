import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.nexaos.app",
  appName: "NEXA OS",
  webDir: "out",
  // Para conectar a tu servidor desplegado (Vercel) y habilitar la IA,
  // descomenta la siguiente línea y pon tu URL real:
  // server: {
  //   url: "https://tu-proyecto-nexa.vercel.app",
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
