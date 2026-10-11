// A definition list of facts. Missing values are shown as "Information unavailable" (never invented).
function Row({ label, children }) {
  return (
    <div className="spec__row">
      <dt>{label}</dt>
      <dd>{children ?? <span className="unavailable">Information unavailable</span>}</dd>
    </div>
  );
}

export default function MedicineSpecifications({ medicine }) {
  const activeIngredients = medicine.activeIngredients ?? medicine.active_ingredients;
  const ingredients = activeIngredients?.length
    ? activeIngredients.map((i) => `${i.name}${i.strength ? ` ${i.strength}` : ''}`).join(', ')
    : null;
  return (
    <dl className="spec">
      <Row label="Brand name">{medicine.brandName ?? medicine.brand_name}</Row>
      <Row label="Generic name">{medicine.genericName ?? medicine.generic_name}</Row>
      <Row label="Active ingredients">{ingredients}</Row>
      <Row label="Strength">{medicine.strength}</Row>
      <Row label="Dosage form">{medicine.dosageForm ?? medicine.dosage_form}</Row>
      <Row label="Manufacturer">{medicine.manufacturer}</Row>
      <Row label="Batch number">{medicine.batch}</Row>
      <Row label="Expiry date">{medicine.expiry}</Row>
    </dl>
  );
}
