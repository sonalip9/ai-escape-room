import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { JSX } from 'react';

import Navbar from '@/components/Navbar';
import { NextTamaguiProvider } from '@/components/NextTamaguiProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Escape Room',
  description: 'AI-generated puzzles escape room',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextTamaguiProvider>
          <Navbar />
          {children}
        </NextTamaguiProvider>
      </body>
    </html>
  );
}
