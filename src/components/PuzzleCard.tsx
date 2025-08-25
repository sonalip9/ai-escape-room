'use client';

import { motion } from 'framer-motion';
import type { JSX } from 'react';
import { useState } from 'react';
import { Button, Input, Spinner, Text, YStack } from 'tamagui';

import type { PuzzleResponse } from '@/app/api/puzzle/route';
import type { PostValidateResponse } from '@/app/api/validate/route';

const MotionText = motion(Text);

export default function PuzzleCard({
  puzzle,
  onSolve,
}: {
  puzzle: PuzzleResponse;
  onSolve: () => void;
}): JSX.Element {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function resetPage(): void {
    setSuccess(false);
    setInput('');
    onSolve();
  }

  function submit(): void {
    if (input.trim() === '') {
      setFeedback('Please enter an answer.');
      return;
    }
    setIsLoading(true);

    fetch('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ puzzle, answer: input }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (res) => res.json() as Promise<PostValidateResponse>)
      .then((data) => {
        if (data.correct) {
          setSuccess(true);
        } else {
          setFeedback('Not quite — try again.');
        }
      })
      .catch((e: unknown) => {
        console.error('Error validating answer:', e);
        setFeedback('An error occurred. Please try again later.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <YStack gap="$3" w="100%" maxW={720}>
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

      {feedback !== null && feedback !== '' && <Text>{feedback}</Text>}

      <YStack ai="center" disabled={isLoading}>
        <Button onPress={submit}>
          {isLoading && <Spinner size="small" mr="$2" />}
          Submit
        </Button>
      </YStack>
    </YStack>
  );
}
