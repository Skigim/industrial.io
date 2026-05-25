import { GameViewport } from './game/GameViewport';
import { Hud } from './ui/Hud';
import { BuildPanel } from './ui/BuildPanel';

export const App = () => (
  <main>
    <Hud />
    <BuildPanel />
    <GameViewport />
  </main>
);