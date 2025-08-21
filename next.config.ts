import { withTamagui } from '@tamagui/next-plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Config options here */
};

const tamaguiPlugin = withTamagui({
  components: ['tamagui'],
  config: './tamagui.config.ts',
  appDir: true,
});

export default tamaguiPlugin(nextConfig);
