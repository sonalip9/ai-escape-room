import { beforeEach, describe, expect, it, vi } from 'vitest';

// === Mocks ===

// Mock createGroq so that ai.ts will create a "client" function.
// The createGroq mock returns a function that simply returns the input model string.
// This is enough because our tests mock `generateObject` directly.
vi.mock('@ai-sdk/groq', () => ({
  createGroq: vi.fn(() => {
    return (modelName: string): string => modelName;
  }),
}));

// We'll mock the 'ai' package used by src/lib/ai.ts.
// - generateObject is the main function we care about and will be mocked per-test.
// - jsonSchema is used by ai.ts when building schemas. Return identity so ai.ts can call it.
const generateObjectMock = vi.fn();
vi.mock('ai', () => ({
  generateObject: generateObjectMock,
  jsonSchema: (x: unknown): unknown => x,
}));

// === Tests ===

beforeEach(() => {
  // Reset module cache so importing ai.ts picks up current mocks and env
  vi.resetModules();
  // Ensure the code under test thinks an API key exists (so it builds a client).
  vi.stubEnv('GROQ_API_KEY', 'test-key');
  // Reset the mocked implementation / call history
  generateObjectMock.mockReset();
});

describe('validateAnswer (validation flow)', () => {
  it('returns local=true when user answer matches canonical or synonyms (no LLM call)', async () => {
    // Import after mocks are set up
    const { validateAnswer } = await import('@/lib/ai');
    const { SAMPLE_PUZZLE } = await import('@/utils/puzzles');

    // SAMPLE_PUZZLE.answer is 'echo' and normalized_answers contains variants.
    const result = await validateAnswer(SAMPLE_PUZZLE, 'Echo'); // Different case
    expect(result.correct).toBe(true);
    expect(result.method).toBe('local');
    // Local match must not trigger the LLM
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('falls back to AI when local check fails and returns AI result', async () => {
    // Arrange: make the mocked generateObject respond with a valid validation JSON
    generateObjectMock.mockResolvedValue({
      object: { correct: true, confidence: 0.82, explanation: 'Matches synonym' },
    });

    const { validateAnswer } = await import('@/lib/ai');
    const { SAMPLE_PUZZLE } = await import('@/utils/puzzles');

    // Use an answer that does not match SAMPLE_PUZZLE normalized_answers
    const userAnswer = 'something unrelated';

    const result = await validateAnswer(SAMPLE_PUZZLE, userAnswer);

    // LLM must be invoked once
    expect(generateObjectMock).toHaveBeenCalled();
    expect(result.correct).toBe(true);
    expect(result.method).toBe('ai');
    // Confidence forwarded
    expect(result.confidence).toBeCloseTo(0.82);
    expect(typeof result.explanation === 'string').toBeTruthy();
  });

  it('handles AI errors gracefully (returns false and method=ai)', async () => {
    // Make generateObject throw
    generateObjectMock.mockRejectedValue(new Error('LLM failure'));

    const { validateAnswer } = await import('@/lib/ai');
    const { SAMPLE_PUZZLE } = await import('@/utils/puzzles');

    const res = await validateAnswer(SAMPLE_PUZZLE, 'no match');

    expect(generateObjectMock).toHaveBeenCalled();
    expect(res.correct).toBe(false);
    expect(res.method).toBe('ai');
    // On failure we currently set confidence 0 and explanation present (see ai.ts)
    expect(res.confidence).toBeDefined();
  });
});
