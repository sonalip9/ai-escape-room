/**
 * A compact wrapper around generateObject that:
 * enforces model/prompt/settings,
 * records duration and a tokens estimate (from result usage if present; otherwise a heuristic),
 * returns result and metadata for calling code to audit/metric.
 */
import type { GenerateObjectResult, Schema } from 'ai';
import { generateObject } from 'ai';

import type { MetricType } from './metrics';
import { recordMetric } from './metrics';

interface CallOpts<T extends Record<string, unknown>> {
  generateObjectOptions: Parameters<typeof generateObject<Schema<T>>>[0] & {
    prompt: string;
  };
  metricType: MetricType;
}

export async function callLLM<T extends Record<string, unknown>>(
  opts: CallOpts<T>,
): Promise<{
  result?: GenerateObjectResult<T>;
  durationMs: number;
  tokensEstimate?: number;
  error?: unknown;
}> {
  const start = Date.now();
  try {
    const result = await generateObject({
      ...opts.generateObjectOptions,
      temperature: opts.generateObjectOptions.temperature ?? 0.0,
      maxOutputTokens: opts.generateObjectOptions.maxOutputTokens ?? 80,
    });

    const durationMs = Date.now() - start;

    // Try to extract tokens usage if available (some SDKs put it under result.usage.total_tokens)
    // Fall back to a heuristic based on length
    const tokensEstimate =
      result.usage.totalTokens ??
      Math.ceil(
        (opts.generateObjectOptions.prompt.length + JSON.stringify(result.object).length) / 4,
      ); // Rough heuristic;

    // Record metrics: calling code may also record; duplicates are cheap
    recordMetric({ usedAI: true, tokensEstimate, durationMs, type: opts.metricType });

    return { result, durationMs, tokensEstimate };
  } catch (error) {
    const durationMs = Date.now() - start;
    recordMetric({ usedAI: true, tokensEstimate: 0, durationMs, type: opts.metricType });
    return { error, durationMs, tokensEstimate: 0 };
  }
}
