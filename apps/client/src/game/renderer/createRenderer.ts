export const createRenderer = (container: HTMLDivElement): (() => void) => {
  const canvas = document.createElement('canvas');

  canvas.setAttribute('aria-label', 'Factory viewport');
  canvas.width = 960;
  canvas.height = 540;

  container.replaceChildren(canvas);

  return () => {
    canvas.remove();
  };
};