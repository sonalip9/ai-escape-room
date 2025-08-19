'use client';
import { Button, Text, YStack } from 'tamagui';

export default function Home() {
  return (
    <YStack f={1} ai="center" jc="center" h="100vh" gap="$4">
      <Text fontSize="$8" color="$color">
        🚀 Tamagui with App Router works!
      </Text>
      <Button>Test Button</Button>
    </YStack>
  );
}
