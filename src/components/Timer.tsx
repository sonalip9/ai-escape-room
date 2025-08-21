'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Text } from 'tamagui';

export default function Timer({ startedAt }: { startedAt: number | null }): JSX.Element {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (startedAt == null) return;
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return (): void => {
      clearInterval(t);
    };
  }, [startedAt]);

  if (startedAt == null) return <Text>Timer: 0s</Text>;
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return <Text>Timer: {secs}s</Text>;
}
