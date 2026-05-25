import { useEffect, useRef } from 'react';

import { createRenderer } from './renderer/createRenderer';

export const GameViewport = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    return createRenderer(viewportRef.current);
  }, []);

  return <div data-testid="game-viewport" ref={viewportRef} />;
};