export type HudProps = {
  ironPlateCount?: number;
};

export const Hud = ({ ironPlateCount = 0 }: HudProps) => (
  <section>
    <h1>Industrial.io</h1>
    <p>Starter region online</p>
    <p>Iron Plate: {ironPlateCount}</p>
  </section>
);