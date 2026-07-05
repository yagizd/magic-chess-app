import type { CapacitorConfig } from '@capacitor/cli';

// Android emülatöründe localhost'a erişmek için backend'e bağlanırken
// .env.local içinde VITE_SERVER_URL=http://10.0.2.2:3001 kullan (useOnlineGame.ts zaten bu env'i okuyor).
// Gerçek cihazda test için bilgisayarın yerel ağ IP'sini kullan (örn. http://192.168.x.x:3001),
// telefon ve bilgisayar aynı Wi-Fi'de olmalı.

const config: CapacitorConfig = {
  appId: 'com.magicchess.app',
  appName: 'Magic Chess',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1c1a18',
      showSpinner: false,
    },
  },
};

export default config;
