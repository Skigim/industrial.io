import WebSocket from 'ws';

const botCount = 25;
const targetRegionId = 'starter-1';
const worldUrl = process.env.WORLD_WS_URL ?? 'ws://127.0.0.1:3002/ws';

const connectBot = (index: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const playerId = `bot-${index}`;
    const socket = new WebSocket(`${worldUrl}?regionId=${targetRegionId}&playerId=${playerId}`);
    let settled = false;

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    const resolveOnce = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    const fail = (error: Error) => {
      socket.close();
      rejectOnce(error);
    };

    const timer = setTimeout(() => {
      fail(new Error(`${playerId} timed out waiting for a region snapshot`));
    }, 10000);

    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'region.join', regionId: targetRegionId, playerId }));
    });

    socket.on('message', (message) => {
      let payload: unknown;

      try {
        payload = JSON.parse(String(message));
      } catch (error) {
        console.error(`Ignoring malformed snapshot for ${playerId}.`, error);
        return;
      }

      if (
        !payload
        || typeof payload !== 'object'
        || (payload as { type?: unknown }).type !== 'region.snapshot'
      ) {
        return;
      }

      clearTimeout(timer);
      socket.close();
      resolveOnce();
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      fail(error instanceof Error ? error : new Error(String(error)));
    });

    socket.on('close', () => {
      clearTimeout(timer);

      if (!settled) {
        rejectOnce(new Error(`${playerId} socket closed before a region snapshot arrived`));
      }
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