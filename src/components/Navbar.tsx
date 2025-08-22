'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { Text, XStack } from 'tamagui';

const links = [
  { href: '/', label: 'Home' },
  { href: '/game', label: 'Puzzle' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar(): JSX.Element {
  const pathname = usePathname();
  const isActive = useCallback(
    (path: string) => {
      return path === pathname;
    },
    [pathname],
  );

  return (
    <XStack
      id="nav"
      jc="space-between"
      ai="center"
      p="$4"
      bg="$background"
      borderBottomWidth={1}
      borderColor="$black6"
    >
      <Text fontWeight="bold" fontSize="$6">
        AI Escape Room
      </Text>
      <XStack gap="$4">
        {links.map(({ href, label }) => (
          <Link key={href} href={href}>
            <Text
              color={isActive(href) ? '$blue10' : '$black10'}
              fontWeight={isActive(href) ? 'bold' : 'normal'}
              hoverStyle={{ color: '$blue10' }}
            >
              {label}
            </Text>
          </Link>
        ))}
      </XStack>
    </XStack>
  );
}
