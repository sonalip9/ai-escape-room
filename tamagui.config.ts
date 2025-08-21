import { defaultConfig, shorthands } from '@tamagui/config/v4';
import { createTamagui } from '@tamagui/core';

const customShorthands = {
  ...shorthands,
  ac: 'alignContent',
  ai: 'alignItems',
  als: 'alignSelf',
  bblr: 'borderBottomLeftRadius',
  bbrr: 'borderBottomRightRadius',
  bg: 'backgroundColor',
  br: 'borderRadius',
  btlr: 'borderTopLeftRadius',
  btrr: 'borderTopRightRadius',
  f: 'flex',
  jc: 'justifyContent',
  h: 'height',
  w: 'width',
} as const;

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  shorthands: customShorthands,
  settings: {
    disableRootThemeClass: true, // Disable root theme class for better SSR performance
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
