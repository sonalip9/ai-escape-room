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
        <style dangerouslySetInnerHTML={{ __html: tamaguiConfig.getNewCSS() }} />
      </>
    );
  });

  return (
    <NextThemeProvider skipNextHead>
      <TamaguiProvider config={tamaguiConfig}>{children}</TamaguiProvider>
    </NextThemeProvider>
  );
}
