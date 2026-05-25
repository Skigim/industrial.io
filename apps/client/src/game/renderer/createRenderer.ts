const minimumWorldWidth = 1600;
const minimumWorldHeight = 1200;
const viewportScale = 2;

const sizeCanvas = (canvas: HTMLCanvasElement, container: HTMLDivElement): void => {
  const width = Math.max(Math.ceil(container.clientWidth * viewportScale), minimumWorldWidth);
  const height = Math.max(Math.ceil(container.clientHeight * viewportScale), minimumWorldHeight);

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
};

export const createRenderer = (container: HTMLDivElement): (() => void) => {
  const canvas = document.createElement('canvas');

  canvas.setAttribute('aria-label', 'Factory viewport');
  canvas.style.display = 'block';

  container.replaceChildren(canvas);

  sizeCanvas(canvas, container);

  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver(() => {
        sizeCanvas(canvas, container);
      });

  resizeObserver?.observe(container);

  return () => {
    resizeObserver?.disconnect();
    canvas.remove();
  };
};