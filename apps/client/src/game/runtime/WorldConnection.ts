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

    return new WebSocket(url.toString());
  }

  joinRegion(socket: WebSocket, regionId: string, playerId: string): void {
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn('Skipped region join because the world socket is not open.');
      return;
    }

    socket.send(JSON.stringify({ type: 'region.join', regionId, playerId }));
  }

  placeBuilding(
    socket: WebSocket,
    regionId: string,
    playerId: string,
    buildingType: 'site-anchor' | 'burner-generator' | 'miner' | 'belt' | 'smelter' | 'storage',
  ): void {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot place a building while the world socket is not open.');
    }

    socket.send(
      JSON.stringify({
        type: 'build.place',
        regionId,
        playerId,
        buildingType,
        tile: { x: 0, y: 0 },
      }),
    );
  }
}