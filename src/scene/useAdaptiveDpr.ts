import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

const SLOW_FRAME_MS = 20;
const SAMPLE = 30;
const STEP = 0.25;

/**
 * Adaptive quality (constitution Principle II, research R4). With frameloop="demand" frames
 * only flow while the camera moves, so frame times are averaged only then; if they run slow
 * the pixel ratio drops in 0.25 steps, never below 1, and never rises again this session.
 */
export function useAdaptiveDpr(): void {
  const controls = useThree((s) => s.controls) as EventTarget | null;
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const moving = useRef(false);
  const samples = useRef<number[]>([]);
  const last = useRef(0);

  useEffect(() => {
    if (!controls) return;
    const on = () => {
      moving.current = true;
      last.current = 0;
    };
    const off = () => {
      moving.current = false;
      samples.current = [];
    };
    controls.addEventListener('wake', on);
    controls.addEventListener('rest', off);
    controls.addEventListener('sleep', off);
    return () => {
      controls.removeEventListener('wake', on);
      controls.removeEventListener('rest', off);
      controls.removeEventListener('sleep', off);
    };
  }, [controls]);

  useFrame(() => {
    if (!moving.current) return;
    const t = performance.now();
    if (last.current) samples.current.push(t - last.current);
    last.current = t;
    if (samples.current.length < SAMPLE) return;
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current = [];
    if (avg > SLOW_FRAME_MS && dpr > 1) setDpr(Math.max(1, dpr - STEP));
  });
}
