const starterBuildings = [
  { id: 'site-anchor', label: 'Site Anchor' },
  { id: 'burner-generator', label: 'Burner Generator' },
  { id: 'miner', label: 'Miner' },
  { id: 'belt', label: 'Belt' },
  { id: 'smelter', label: 'Smelter' },
  { id: 'storage', label: 'Storage' },
] as const;

type BuildingType = (typeof starterBuildings)[number]['id'];

const sectionStyle = {
  display: 'grid',
  gap: '8px',
  minWidth: '220px',
} as const;

const buildButtonStyle = (isArmed: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '8px',
  border: `1px solid ${isArmed ? '#6fd0ff' : 'rgba(255, 255, 255, 0.16)'}`,
  background: isArmed ? 'rgba(111, 208, 255, 0.22)' : 'rgba(8, 19, 31, 0.78)',
  boxShadow: isArmed ? '0 0 0 1px rgba(111, 208, 255, 0.35)' : 'none',
  color: '#f2f7fb',
  cursor: 'pointer',
  fontWeight: isArmed ? 600 : 500,
}) as const;

const armedBadgeStyle = {
  color: '#6fd0ff',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
} as const;

export type BuildPanelProps = {
  armedBuildingType?: BuildingType | null;
  onArm?: (buildingType: BuildingType) => void;
  onCancel?: () => void;
};

export const BuildPanel = ({ armedBuildingType = null, onArm, onCancel }: BuildPanelProps) => (
  <section style={sectionStyle}>
    <h2>Build</h2>
    {starterBuildings.map((building) => {
      const isArmed = armedBuildingType === building.id;

      return (
        <button
          key={building.id}
          type="button"
          aria-pressed={isArmed}
          onClick={() => onArm?.(building.id)}
          style={buildButtonStyle(isArmed)}
        >
          <span>{building.label}</span>
          {isArmed ? (
            <span aria-hidden="true" style={armedBadgeStyle}>
              Armed
            </span>
          ) : null}
        </button>
      );
    })}
    {armedBuildingType ? (
      <button type="button" onClick={onCancel}>
        Cancel Build Tool
      </button>
    ) : null}
  </section>
);