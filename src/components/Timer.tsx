'use client';

import { useEffect, useState } from 'react';
import { Text } from 'tamagui';

export default function Timer({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  if (!startedAt) return <Text>Timer: 0s</Text>;
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return <Text>Timer: {secs}s</Text>;
}
