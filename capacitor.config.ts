import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.compracerta.app',
  appName: 'Compra Certa',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
