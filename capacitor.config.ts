import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.nexaos.app",
  appName: "NEXA OS",
  webDir: "out",
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
