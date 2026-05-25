const starterBuildings = [
  'Site Anchor',
  'Burner Generator',
  'Miner',
  'Belt',
  'Smelter',
  'Storage',
];

export const BuildPanel = () => (
  <section>
    <h2>Build</h2>
    {starterBuildings.map((building) => (
      <button key={building} type="button">
        {building}
      </button>
    ))}
  </section>
);