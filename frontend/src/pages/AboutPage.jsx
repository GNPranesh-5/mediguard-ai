import PageContainer from '../components/PageContainer';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import ExpandableSection from '../components/ExpandableSection';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AboutPage() {
  useDocumentTitle('About and safety');
  return (
    <PageContainer title="About and safety" intro="What MediGuard AI does, what it cannot do, and why you should still ask a professional.">
      <div className="prose">
        <h2>What it does</h2>
        <p>MediGuard AI helps you look up general information about a medicine: its name, ingredients, usual uses, side effects, warnings and storage guidance. You can start from a photo of the package or search by name.</p>

        <h2>How image analysis is intended to work</h2>
        <ol className="plain-steps">
          <li>You upload a photo of the package.</li>
          <li>Text on the package is extracted (OCR).</li>
          <li>An AI model suggests which medicine it might be.</li>
          <li>The suggestion is compared with a trusted reference database.</li>
          <li>You see the result with each part labelled by how well it is verified.</li>
        </ol>
        <p className="muted">This website is the interface only. Until the backend is connected, steps 2 to 4 do not run, and demo mode shows sample records instead.</p>

        <h2>Three different things</h2>
        <div className="three-col">
          <div className="card"><h3>OCR</h3><p>Reads the letters printed on the package. It can misread blurry or curved text.</p></div>
          <div className="card"><h3>AI identification</h3><p>A model’s best guess at which medicine it is. A guess can be wrong, so it is labelled “AI suggestion”.</p></div>
          <div className="card"><h3>Reference data</h3><p>Information from a trusted source. Only a match here earns the label “Reference matched”.</p></div>
        </div>

        <h2>What it can and cannot verify</h2>
        <div className="three-col">
          <div className="card"><h3>It can</h3><ul className="dot-list"><li>Show text found on the package</li><li>Suggest a likely medicine</li><li>Show reference information when a match exists</li></ul></div>
          <div className="card"><h3>It cannot</h3><ul className="dot-list dot-list--warn"><li>Prove a medicine is genuine or not counterfeit</li><li>Confirm it is right for you</li><li>Check interactions with your other medicines</li><li>Replace a doctor or pharmacist</li></ul></div>
        </div>

        <h2>Why recognition may fail</h2>
        <ExpandableSection title="Common reasons" defaultOpen>
          <ul className="dot-list">
            <li>The photo is blurry, dark, or reflects light off glossy packaging.</li>
            <li>The name is hidden by a fold, a curve or a sticker.</li>
            <li>The packaging is unusual, damaged or in an unsupported language.</li>
            <li>The medicine is not in the reference database.</li>
          </ul>
          <p style={{ marginTop: 12 }}>If this happens, retake the photo or use manual search.</p>
        </ExpandableSection>

        <h2>Medical disclaimer</h2>
        <MedicalDisclaimer />
        <p style={{ marginTop: 16 }}>If you think you have taken too much of a medicine, or feel unwell after taking one, contact a doctor or your local emergency number right away.</p>
      </div>
    </PageContainer>
  );
}
