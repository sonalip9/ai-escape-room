import type { NextConfig } from 'next';
import { withTamagui } from '@tamagui/next-plugin';

const nextConfig: NextConfig = {
  /* config options here */
  skipReactNativeWebExports: true,
};

const tamaguiPlugin = withTamagui({
  components: ['tamagui'],
  config: './tamagui.config.ts',
  appDir: true,
});

export default tamaguiPlugin(nextConfig);
