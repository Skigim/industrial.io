const starterBuildings = [
  { id: 'site-anchor', label: 'Site Anchor' },
  { id: 'burner-generator', label: 'Burner Generator' },
  { id: 'miner', label: 'Miner' },
  { id: 'belt', label: 'Belt' },
  { id: 'smelter', label: 'Smelter' },
  { id: 'storage', label: 'Storage' },
] as const;

export type BuildPanelProps = {
  onBuild?: (buildingType: (typeof starterBuildings)[number]['id']) => void;
};

export const BuildPanel = ({ onBuild }: BuildPanelProps) => (
  <section>
    <h2>Build</h2>
    {starterBuildings.map((building) => (
      <button key={building.id} type="button" onClick={() => onBuild?.(building.id)}>
        {building.label}
      </button>
    ))}
  </section>
);