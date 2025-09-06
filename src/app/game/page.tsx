'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';

import type { PostLeaderboardRequest } from '@/app/api/leaderboard/route';
import type { PostPuzzleRequest, PostPuzzleResponse, PuzzleResponse } from '@/app/api/puzzle/route';
import PuzzleCard from '@/components/PuzzleCard';
import Timer from '@/components/Timer';

const NUMBER_OF_PUZZLE_PER_GAME = 3;

// Game page states - New game start, play game, game over

export default function GamePage(): JSX.Element {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [puzzles, setPuzzles] = useState<PuzzleResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (startedAt !== null && finishedAt !== null) {
      setTimeSeconds(Math.max(1, Math.round((finishedAt - startedAt) / 1000)));
    }
  }, [startedAt, finishedAt]);

  const fetchPuzzle = useCallback(async function (): Promise<void> {
    console.debug('Fetching new puzzle...');
    const res = await fetch('/api/puzzle', {
      method: 'POST',
      body: JSON.stringify({ count: NUMBER_OF_PUZZLE_PER_GAME } as PostPuzzleRequest),
    });
    const data = (await res.json()) as PostPuzzleResponse;
    console.debug('Fetched puzzles:', data.puzzles);
    setPuzzles(data.puzzles);
  }, []);

  const startGame = useCallback(
    async function (): Promise<void> {
      console.debug('Starting new game...');
      setLoading(true);
      await fetchPuzzle();
      setIndex(1);
      setStartedAt(Date.now());
      setFinishedAt(null);
      setTimeSeconds(null);
      setLoading(false);
    },
    [fetchPuzzle],
  );

  const onSolve = useCallback(
    function (): void {
      console.debug('Puzzle solved');
      if (index < NUMBER_OF_PUZZLE_PER_GAME) {
        setIndex((i) => i + 1);
      } else {
        const end = Date.now();
        setFinishedAt(end);
      }
    },
    [index],
  );

  const submitScore = useCallback(
    async function (): Promise<void> {
      if (timeSeconds === null) return;

      setSubmissionError(null);
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, time_seconds: timeSeconds } as PostLeaderboardRequest),
        });

        if (!res.ok) {
          const errorData = await res.json();
          const errorMessage = errorData.error || 'Failed to submit score';
          
          if (res.status === 429) {
            setSubmissionError('Rate limit exceeded. Please try again later.');
            return;
          } else if (res.status === 400) {
            setSubmissionError(`Invalid submission: ${errorMessage}`);
            return;
          } else {
            setSubmissionError('Failed to submit score. Please try again.');
            return;
          }
        }

        router.push('/leaderboard');
      } catch (e) {
        console.warn('Leaderboard API insert failed', e);
        setSubmissionError('Network error. Please check your connection and try again.');
      }
    },
    [name, router, timeSeconds],
  );

  // When finished show final screen with name input
  if (finishedAt !== null) {
    return (
      <YStack p="$4" gap="$4" ai="center" jc="center" h="100vh">
        <Text fontSize="$6">🎉 You escaped!</Text>
        <Text>Your time: {timeSeconds} seconds</Text>
        
        {submissionError && (
          <YStack p="$3" br={8} bg="rgba(255, 0, 0, 0.1)">
            <Text color="red" fontSize="$3">
              {submissionError}
            </Text>
          </YStack>
        )}
        
        <Input
          br="$6"
          placeholder="Your name (for leaderboard)"
          value={name}
          onChangeText={setName}
          minW="$20"
        />
        <XStack gap="$3">
          <Button
            onPress={() => {
              submitScore().catch((e: unknown) => {
                console.error('Error submitting the score:', e);
              });
            }}
          >
            Submit Score
          </Button>
          <Button
            onPress={() => {
              setFinishedAt(null);
              startGame().catch((e: unknown) => {
                console.error('Error starting the game:', e);
                setLoading(false);
              });
            }}
          >
            Play Again
          </Button>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack p="$4" gap="$4" ai="center" jc="center" h="100vh">
      <Text fontSize="$5">
        Escape Room
        {startedAt !== null
          ? ` - Puzzle ${index.toString()} of ${NUMBER_OF_PUZZLE_PER_GAME.toString()}`
          : ''}
      </Text>

      <Timer startedAt={startedAt} />

      {startedAt === null || puzzles.length === 0 ? (
        <Button
          disabled={loading}
          onPress={() => {
            startGame().catch((e: unknown) => {
              console.error('Error starting the game:', e);
              setLoading(false);
            });
          }}
        >
          {loading && <Spinner size="small" mr="$2" />}
          Start
        </Button>
      ) : (
        <PuzzleCard puzzle={puzzles[index - 1]} onSolve={onSolve} />
      )}

      <Button
        variant="outlined"
        onPress={() => {
          router.push('/');
        }}
      >
        Exit
      </Button>
    </YStack>
  );
}
