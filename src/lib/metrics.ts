/**
 * A tiny, dependency-free in-memory metrics collector.
 * It can later be wired to Prometheus, Datadog, etc. Designed
 * for dev/CI and simple runtime insights (prints metrics occasionally).
 */
export type MetricType = 'validation' | 'generation';
type Counters = Record<string, number>;
type Timings = Record<string, { count: number; totalMs: number; avgMs: number }>;

const counters: Counters = {};
const timings: Timings = {};
let lastDump = Date.now();

export function incr(name: string, by = 1): void {
  counters[name] = (counters[name] || 0) + by;
}

export function recordTiming(name: string, ms: number): void {
  const cur = timings[name] ?? { count: 0, totalMs: 0 };
  cur.count += 1;
  cur.totalMs += ms;
  timings[name] = cur;
}

function updatePeriodically(): void {
  // Periodically log metrics to console for visibility (every 30s)
  const now = Date.now();
  if (now - lastDump > 30_000) {
    lastDump = now;
    try {
      // Shallow summary
      const summary: { counters: Counters; timings: Timings } = {
        counters: { ...counters },
        timings: Object.fromEntries(
          Object.entries(timings).map(([k, v]) => [
            k,
            { count: v.count, totalMs: v.totalMs, avgMs: v.totalMs / v.count },
          ]),
        ),
      };

      console.info('[metrics] validation summary', JSON.stringify(summary));
    } catch (e) {
      console.warn('[metrics] failed to dump metrics', e);
    }
  }
}

/**
 * Record a small  metric.
 */
export function recordMetric(opts: {
  usedAI: boolean;
  type: MetricType;
  tokensEstimate?: number;
  durationMs?: number;
}): void {
  if (opts.usedAI) {
    incr(`${opts.type}.ai.calls`);
    if (typeof opts.tokensEstimate === 'number')
      incr(`${opts.type}.ai.tokens`, Math.round(opts.tokensEstimate));
    if (typeof opts.durationMs === 'number')
      recordTiming(`${opts.type}.ai.latency_ms`, opts.durationMs);
  } else {
    incr(`${opts.type}.local.calls`);
    if (typeof opts.durationMs === 'number')
      recordTiming(`${opts.type}.local.latency_ms`, opts.durationMs);
  }

  updatePeriodically();
}

export function getMetricsSnapshot(): {
  counters: Counters;
  timings: Timings;
} {
  return {
    counters: { ...counters },
    timings: Object.fromEntries(
      Object.entries(timings).map(([k, v]) => [
        k,
        { count: v.count, totalMs: v.totalMs, avgMs: v.totalMs / v.count },
      ]),
    ),
  };
}
