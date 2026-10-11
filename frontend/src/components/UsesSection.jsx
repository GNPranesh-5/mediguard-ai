// "General uses" + "How it works". Shows a clear unavailable message if the data is missing.
export default function UsesSection({ medicine }) {
  const hasUses = medicine.uses?.length > 0;
  return (
    <>
      <h4>General uses</h4>
      {hasUses
        ? <ul className="dot-list">{medicine.uses.map((u) => <li key={u}>{u}</li>)}</ul>
        : <p className="unavailable">Information unavailable</p>}
      <h4 style={{ marginTop: 20 }}>How it works</h4>
      {medicine.howItWorks ?? medicine.how_it_works ? <p>{medicine.howItWorks ?? medicine.how_it_works}</p> : <p className="unavailable">Information unavailable</p>}
    </>
  );
}
