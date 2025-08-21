'use client';

import { useState } from 'react';
import { YStack, Text, Button, Input } from 'tamagui';

import type { Puzzle } from '@/utils/puzzles';

export default function PuzzleCard({ puzzle, onSolve }: { puzzle: Puzzle; onSolve: () => void }) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  function submit() {
    const normalized = input.trim().toLowerCase();
    if (normalized === puzzle.answer.trim().toLowerCase()) {
      setFeedback('Correct!');
      setTimeout(() => {
        setFeedback(null);
        setInput('');
        onSolve();
      }, 500);
    } else {
      setFeedback('Not quite — try again.');
    }
  }

  return (
    <YStack gap="$3" width="100%" maxW={720}>
      <Text fontSize="$3" text="center">
        {puzzle.question}
      </Text>

      <Input
        value={input}
        onChangeText={(text) => {
          setInput(text);
          setFeedback(null); // Clear feedback on input change
        }}
        placeholder="Type your answer..."
        onSubmitEditing={submit}
      />
      {feedback && <Text>{feedback}</Text>}

      <YStack ai="center">
        <Button onPress={submit}>Submit</Button>
      </YStack>
    </YStack>
  );
}
