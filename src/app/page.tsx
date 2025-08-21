'use client';

import Link from 'next/link';
import { YStack, Text, Button } from 'tamagui';

export default function HomePage() {
  return (
    <YStack f={1} ai="center" jc="center" h="100vh" gap="$4" p="$4">
      <Text fontSize="$7">🕵️‍♀️ AI Escape Room</Text>
      <Text fontSize="$2" opacity={0.8}>
        Three puzzles — generated (later) by AI. Beat the clock!
      </Text>

      <YStack gap="$3" mt="$4" ai="center">
        <Link href="/game" passHref>
          <Button>Start Game</Button>
        </Link>
        <Link href="/leaderboard" passHref>
          <Button variant="outlined">View Leaderboard</Button>
        </Link>
      </YStack>
    </YStack>
  );
}
