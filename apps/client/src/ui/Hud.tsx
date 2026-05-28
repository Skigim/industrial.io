import type { VisibleScenario } from '../game/visibleWorld';

export type HudProps = {
  scenario?: VisibleScenario | null;
};

const hudStyle = {
  display: 'grid',
  gap: '12px',
  maxWidth: '300px',
  color: '#f2f7fb',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.55)',
} as const;

const hudTitleStyle = {
  margin: 0,
  color: '#f2f7fb',
} as const;

const hudTextStyle = {
  margin: 0,
  color: 'rgba(242, 247, 251, 0.86)',
} as const;

const visualKeyStyle = {
  display: 'grid',
  gap: '7px',
  padding: '10px',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  background: 'rgba(8, 19, 31, 0.78)',
  color: '#f2f7fb',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.24)',
} as const;

const visualKeyTitleStyle = {
  margin: 0,
  color: 'rgba(242, 247, 251, 0.76)',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} as const;

const visualKeyGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '6px 10px',
} as const;

const visualKeyItemStyle = {
  display: 'grid',
  gridTemplateColumns: '22px 1fr',
  alignItems: 'center',
  gap: '7px',
  minWidth: 0,
  fontSize: '12px',
  lineHeight: 1.15,
} as const;

const visualKeySwatchStyle = {
  width: '22px',
  height: '16px',
  border: '1px solid rgba(255, 255, 255, 0.36)',
  boxShadow: 'inset 0 0 0 2px rgba(0, 0, 0, 0.22)',
} as const;

const visualKeyItems = [
  { label: 'Site', color: '#173243', accent: '#6fd0ff' },
  { label: 'Miner', color: '#213c2d', accent: '#78c36d' },
  { label: 'Smelter', color: '#4b302b', accent: '#ff8c3c' },
  { label: 'Constructor', color: '#4a431f', accent: '#e8c54f' },
  { label: 'Storage', color: '#303d4b', accent: '#adc2d4' },
  { label: 'Belt', color: '#26323d', accent: '#d7e0e7' },
];

export const Hud = ({ scenario }: HudProps) => {
  const current = scenario?.current ?? 0;
  const target = scenario?.target ?? 0;
  const isComplete = scenario?.isComplete ?? false;
  const repairIsPlaced = scenario?.repair?.isPlaced ?? false;

  return (
    <section style={hudStyle}>
      <h1 style={hudTitleStyle}>Industrial.io</h1>
      <p style={hudTextStyle}>Starter region online</p>
      {!repairIsPlaced ? <p style={hudTextStyle}>Repair the highlighted belt gap</p> : null}
      <p style={hudTextStyle}>Construction Parts: {current} / {target}</p>
      {isComplete ? <p style={hudTextStyle}>Starter line complete</p> : null}
      <section aria-label="Visual key" style={visualKeyStyle}>
        <h2 style={visualKeyTitleStyle}>Visual key</h2>
        <div style={visualKeyGridStyle}>
          {visualKeyItems.map((item) => (
            <div key={item.label} style={visualKeyItemStyle}>
              <span
                aria-hidden="true"
                style={{
                  ...visualKeySwatchStyle,
                  background: `linear-gradient(90deg, ${item.color} 0 58%, ${item.accent} 58% 100%)`,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};