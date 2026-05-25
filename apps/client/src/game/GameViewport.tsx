import { useEffect, useRef } from 'react';

import { createRenderer } from './renderer/createRenderer';

const viewportStyle = {
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  background:
    'radial-gradient(circle at top, rgba(54, 92, 132, 0.35), transparent 35%), linear-gradient(180deg, #08131f 0%, #101f30 100%)',
} as const;

export const GameViewport = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    return createRenderer(viewportRef.current);
  }, []);

  return <div data-testid="game-viewport" ref={viewportRef} style={viewportStyle} />;
};