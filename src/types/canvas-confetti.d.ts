declare module 'canvas-confetti' {
  export interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: Array<'square' | 'circle' | 'star'>;
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    flat?: boolean;
    resize?: boolean;
    useWorker?: boolean;
  }

  function confetti(options?: Options): Promise<null> | null;
  export default confetti;
}
