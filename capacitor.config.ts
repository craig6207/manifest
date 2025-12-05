import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.ionic.werecruit',
  appName: 'mob-we-recruit',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
    },
  },
};
export default config;
