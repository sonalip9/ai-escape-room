'use client';

import '@tamagui/core/reset.css';
// import '@tamagui/polyfill-dev'
import { ReactNode } from 'react';

import { useServerInsertedHTML } from 'next/navigation';
import { TamaguiProvider } from 'tamagui';
import { NextThemeProvider } from '@tamagui/next-theme';
import tamaguiConfig from '../../tamagui.config';

export function NextTamaguiProvider({ children }: { children: ReactNode }) {
  useServerInsertedHTML(() => {
    // Tamagui CSS for SSR
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: tamaguiConfig.getNewCSS() }} />
      </>
    );
  });

  return (
    <NextThemeProvider skipNextHead>
      <TamaguiProvider config={tamaguiConfig} disableRootThemeClass>
        {children}
      </TamaguiProvider>
    </NextThemeProvider>
  );
}
