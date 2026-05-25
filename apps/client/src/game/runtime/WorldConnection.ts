const getDefaultWorldUrl = (): string => {
  if (import.meta.env.VITE_WORLD_WS_URL) {
    return import.meta.env.VITE_WORLD_WS_URL;
  }

  const url = new URL('/ws', window.location.origin);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
};

export class WorldConnection {
  constructor(private readonly worldUrl: string = getDefaultWorldUrl()) {}

  connect(regionId: string, playerId: string): WebSocket {
    const url = new URL(this.worldUrl);

    url.searchParams.set('regionId', regionId);
    url.searchParams.set('playerId', playerId);

    return new WebSocket(url);
  }
}