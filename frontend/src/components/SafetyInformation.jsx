import { ShieldAlert, ListChecks, Ban, Snowflake, Gauge } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

function List({ items, warn }) {
  if (!items || items.length === 0) return <p className="unavailable">Information unavailable</p>;
  return <ul className={`dot-list${warn ? ' dot-list--warn' : ''}`}>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}
function Text({ value }) {
  return value ? <p>{value}</p> : <p className="unavailable">Information unavailable</p>;
}

// All safety topics as expandable sections. Warnings open by default because they matter most.
export default function SafetyInformation({ medicine }) {
  return (
    <div>
      <ExpandableSection title="Warnings and precautions" icon={ShieldAlert} defaultOpen><List items={medicine.warnings} warn /></ExpandableSection>
      <ExpandableSection title="Common side effects" icon={ListChecks}><List items={medicine.sideEffects ?? medicine.side_effects} /></ExpandableSection>
      <ExpandableSection title="Contraindications" icon={Ban}><List items={medicine.contraindications} warn /></ExpandableSection>
      <ExpandableSection title="Label dosage information" icon={Gauge}><Text value={medicine.labelDosage ?? medicine.label_dosage} /></ExpandableSection>
      <ExpandableSection title="Storage guidance" icon={Snowflake}><Text value={medicine.storage} /></ExpandableSection>
    </div>
  );
}
