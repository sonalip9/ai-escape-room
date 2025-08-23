import { withTamagui } from '@tamagui/next-plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Config options here */
  turbopack: {
    root: __dirname,
  },
};

const tamaguiPlugin = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],

  // Disable static extraction, faster to iterate in dev mode (default false)
  disableExtraction: process.env.NODE_ENV === 'development',
  outputCSS: process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,

  // Exclude react-native-web modules to lighten bundle
  excludeReactNativeWebExports: ['Switch', 'ProgressBar', 'Picker'],

  appDir: true,
});

export default {
  ...nextConfig,
  ...tamaguiPlugin(nextConfig),
};
