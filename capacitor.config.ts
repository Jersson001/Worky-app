import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worky.app.v2',
  appName: 'Worky',
  webDir: 'dist',
  plugins: {
    Camera: {
      // Use system picker for photos/videos (Android 13+)
      // Complies with Google Play policy by avoiding broad storage permissions
      presentationStyle: 'popover',
    },
  },
};

export default config;
