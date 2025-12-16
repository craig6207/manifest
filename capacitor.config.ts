import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.ionic.recruut',
  appName: 'Recruut',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
    },
  },
};
export default config;
