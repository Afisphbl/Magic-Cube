import { useState, useEffect } from 'react';
import { useCubeStore } from '../store/useCubeStore';
import { formatTimer } from '../logic/timer';

/**
 * Local ticker hook for the active solve timer.
 * Updates local display text at ~30Hz during RUNNING status by computing
 * elapsed duration from wall clock timestamp (Date.now() - solveStartTime).
 * Freezes cleanly on STOPPED, resets to 0.00 on IDLE, and does NOT broadcast
 * high frequency state updates to the global Zustand store.
 */
export function useTimerTicker(): string {
  const timerStatus = useCubeStore((state) => state.timerStatus);
  const solveStartTime = useCubeStore((state) => state.solveStartTime);
  const solveEndTime = useCubeStore((state) => state.solveEndTime);
  const timerMs = useCubeStore((state) => state.timerMs);
  const accumulatedTimeMs = useCubeStore((state) => state.accumulatedTimeMs);
  const isPaused = useCubeStore((state) => state.isPaused);
  const latestSolve = useCubeStore((state) => state.latestSolve);

  const [displayText, setDisplayText] = useState<string>(() => {
    if (timerStatus === 'IDLE') return '0.00';
    if (timerStatus === 'STOPPED') {
      const ms = latestSolve?.timeMs ?? (solveEndTime && solveStartTime ? solveEndTime - solveStartTime : timerMs);
      return formatTimer(ms);
    }
    if (timerStatus === 'PAUSED' || isPaused) {
      return formatTimer(accumulatedTimeMs);
    }
    if (timerStatus === 'RUNNING' && solveStartTime !== null) {
      return formatTimer(accumulatedTimeMs + Math.max(0, Date.now() - solveStartTime));
    }
    return '0.00';
  });

  useEffect(() => {
    if (timerStatus === 'IDLE') {
      setDisplayText('0.00');
      return;
    }

    if (timerStatus === 'STOPPED') {
      const ms = latestSolve?.timeMs ?? (solveEndTime && solveStartTime ? solveEndTime - solveStartTime : timerMs);
      setDisplayText(formatTimer(ms));
      return;
    }

    if (timerStatus === 'PAUSED' || isPaused) {
      setDisplayText(formatTimer(accumulatedTimeMs));
      return;
    }

    if (timerStatus === 'RUNNING' && solveStartTime !== null) {
      const update = () => {
        const elapsed = accumulatedTimeMs + Math.max(0, Date.now() - solveStartTime);
        setDisplayText(formatTimer(elapsed));
      };

      update();
      const intervalId = setInterval(update, 33);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [timerStatus, solveStartTime, solveEndTime, timerMs, accumulatedTimeMs, isPaused, latestSolve]);

  return displayText;
}
