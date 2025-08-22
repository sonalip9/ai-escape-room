'use client';

import '@tamagui/core/reset.css';
import { NextThemeProvider } from '@tamagui/next-theme';
import { useServerInsertedHTML } from 'next/navigation';
import type { JSX, ReactNode } from 'react';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from '../../tamagui.config';

export function NextTamaguiProvider({ children }: { children: ReactNode }): JSX.Element {
  useServerInsertedHTML(() => {
    // Tamagui CSS for SSR
    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: tamaguiConfig.getCSS({
              // If you are using "outputCSS" option, you should use this "exclude"
              // if not, then you can leave the option out
              exclude: process.env.NODE_ENV === 'production' ? 'design-system' : null,
            }),
          }}
        />
      </>
    );
  });

  return (
    <NextThemeProvider skipNextHead>
      <TamaguiProvider config={tamaguiConfig}>{children}</TamaguiProvider>
    </NextThemeProvider>
  );
}
