import { Stethoscope } from 'lucide-react';

export default function MedicalDisclaimer() {
  return (
    <aside className="notice notice--info" aria-label="Medical disclaimer">
      <Stethoscope size={20} aria-hidden="true" />
      <p>
        <strong>Not medical advice.</strong> MediGuard AI shares general information only. It cannot confirm that a
        tablet is safe or genuine. Check the package label and ask a doctor or pharmacist before taking any medicine.
      </p>
    </aside>
  );
}
