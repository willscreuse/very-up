import { useEffect, useRef, useState } from 'react';

/**
 * Compte à rebours basé sur une échéance absolue (et non sur un compteur) :
 * il reste juste même si l'app passe en arrière-plan ou est relancée.
 */
export function useCountdown(
  endsAt: number | null,
  { onSecond, onExpire }: { onSecond?: (secondsLeft: number) => void; onExpire?: () => void } = {},
) {
  const [now, setNow] = useState(() => Date.now());
  const lastSecond = useRef<number | null>(null);
  const callbacks = useRef({ onSecond, onExpire });
  useEffect(() => {
    callbacks.current = { onSecond, onExpire };
  });

  useEffect(() => {
    if (endsAt === null) return;
    lastSecond.current = null;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const left = Math.max(0, endsAt - t);
      const sec = Math.ceil(left / 1000);
      if (sec !== lastSecond.current) {
        lastSecond.current = sec;
        callbacks.current.onSecond?.(sec);
      }
      if (left <= 0) {
        clearInterval(id);
        callbacks.current.onExpire?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  const msLeft = endsAt === null ? 0 : Math.max(0, endsAt - now);
  return { msLeft, secondsLeft: Math.ceil(msLeft / 1000) };
}
