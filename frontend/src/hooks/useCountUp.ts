import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * Animates a formatted stat string's leading number from its previous value
 * (0 on first mount) up to the new target, preserving any non-numeric
 * prefix/suffix (e.g. "$1,234.50", "59.9%", "32/80 occupied") and the
 * original's decimal/comma formatting. Falls back to the static value with
 * no animation when the user prefers reduced motion, or when no numeric
 * portion can be found.
 */
export function useCountUp(value: string, durationSec = 0.8): string {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevTarget = useRef<number | null>(null);

  useEffect(() => {
    const match = value.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
    if (!match || shouldReduceMotion) {
      setDisplay(value);
      return;
    }

    const [, prefix, numberPart, suffix] = match;
    const decimals = numberPart.includes('.') ? numberPart.split('.')[1].length : 0;
    const target = Number(numberPart.replace(/,/g, ''));
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }

    const useGrouping = numberPart.includes(',') || target >= 1000;
    const from = prevTarget.current ?? 0;
    prevTarget.current = target;

    const controls = animate(from, target, {
      duration: durationSec,
      ease: 'easeOut',
      onUpdate: (latest) => {
        const formatted = latest.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          useGrouping,
        });
        setDisplay(`${prefix}${formatted}${suffix}`);
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, shouldReduceMotion, durationSec]);

  return display;
}
