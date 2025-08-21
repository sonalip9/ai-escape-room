'use client';

import { motion } from 'framer-motion';
import type { JSX } from 'react';
import { useState } from 'react';
import { Button, Input, Text, YStack } from 'tamagui';

import type { Puzzle } from '@/utils/puzzles';

const MotionText = motion(Text);

export default function PuzzleCard({
  puzzle,
  onSolve,
}: {
  puzzle: Puzzle;
  onSolve: () => void;
}): JSX.Element {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetPage(): void {
    setSuccess(false);
    setInput('');
    onSolve();
  }

  function submit(): void {
    const normalized = input.trim().toLowerCase();
    if (normalized === puzzle.answer.trim().toLowerCase()) {
      setSuccess(true);
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
      {success && (
        <MotionText
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 10, duration: 0.8 }}
          onAnimationComplete={resetPage}
          color="$green10"
        >
          🎉 Correct! 🎉
        </MotionText>
      )}

      {feedback != null && feedback != '' && <Text>{feedback}</Text>}

      <YStack ai="center">
        <Button onPress={submit}>Submit</Button>
      </YStack>
    </YStack>
  );
}
