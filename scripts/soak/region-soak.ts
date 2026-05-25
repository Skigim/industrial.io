import WebSocket from 'ws';

const botCount = 25;
const targetRegionId = 'starter-1';
const worldUrl = process.env.WORLD_WS_URL ?? 'ws://127.0.0.1:3002/ws';

const connectBot = (index: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const playerId = `bot-${index}`;
    const socket = new WebSocket(`${worldUrl}?regionId=${targetRegionId}&playerId=${playerId}`);

    const fail = (error: Error) => {
      socket.close();
      reject(error);
    };

    const timer = setTimeout(() => {
      fail(new Error(`${playerId} timed out waiting for a region snapshot`));
    }, 10000);

    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'region.join', regionId: targetRegionId, playerId }));
    });

    socket.on('message', (message) => {
      const payload = JSON.parse(String(message));

      if (payload.type !== 'region.snapshot') {
        return;
      }

      clearTimeout(timer);
      socket.close();
      resolve();
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      fail(error instanceof Error ? error : new Error(String(error)));
    });

    socket.on('close', () => {
      clearTimeout(timer);
    });
  });

const main = async (): Promise<void> => {
  await Promise.all(Array.from({ length: botCount }, (_, index) => connectBot(index)));
  console.log(`Connected ${botCount} bots to ${targetRegionId}`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});