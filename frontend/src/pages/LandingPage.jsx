import { motion } from 'framer-motion';
import { ScanLine, Search, Camera, TextSearch, Database, FileCheck2, Layers, History, Smartphone, ShieldCheck, Pill } from 'lucide-react';
import Button from '../components/Button';
import ExpandableSection from '../components/ExpandableSection';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const STEPS = [
  { icon: Camera, title: 'Photograph the package', text: 'Upload or take a clear photo of the front, and optionally the back.' },
  { icon: TextSearch, title: 'Package text is read', text: 'Text on the label is extracted so you can check it against the box.' },
  { icon: Database, title: 'Matched to reference data', text: 'The name is compared with a trusted medicine reference, not guessed.' },
  { icon: FileCheck2, title: 'You review the result', text: 'See uses, warnings and sources, with each status clearly marked.' },
];

const FEATURES = [
  { icon: ScanLine, title: 'Image-based identification', text: 'Start from a photo of the medicine package.' },
  { icon: Search, title: 'Manual search fallback', text: 'If a photo fails, search by brand or generic name.' },
  { icon: Layers, title: 'Clear status labels', text: 'AI suggestions, reference matches and items that need review look different.' },
  { icon: ShieldCheck, title: 'Safety information', text: 'Warnings, side effects, storage and label guidance in one place.' },
  { icon: History, title: 'History and saved items', text: 'Return to earlier scans and keep medicines you want to revisit.' },
  { icon: Smartphone, title: 'One site, every device', text: 'Works in the browser on desktop, tablet, Android and iPhone.' },
];

const FAQS = [
  ['Can MediGuard AI tell me if a medicine is safe to take?', 'No. It shows general information and marks what is verified. Only a doctor or pharmacist can judge what is safe for you.'],
  ['Can it detect fake medicines?', 'No. A photo cannot prove a medicine is genuine. Buy from licensed pharmacies and report concerns to a pharmacist.'],
  ['What if the photo is not recognised?', 'Use Search to look up the medicine by brand name or active ingredient.'],
  ['Is this a finished product?', 'This is a college training project. Until a backend is connected it runs in demo mode with sample records.'],
];

// Item variants for the staggered feature-card entrance.
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function LandingPage() {
  useDocumentTitle('');
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1>Understand Your Medicine. Make Informed Decisions.</h1>
            <p className="hero__lead">
              Photograph a medicine package and see what it is, what it is generally used for, and what to watch out
              for, with every piece of information labelled by how well it is verified.
            </p>
            <div className="hero__cta">
              <Button to="/scan" icon={ScanLine}>Scan a Medicine</Button>
              <Button to="/search" variant="secondary" icon={Search}>Search Medicine</Button>
            </div>
          </motion.div>

          {/* Static illustration of the result screen. It is NOT live output. */}
          <motion.figure className="mock" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} aria-label="Illustrative preview of a result screen">
            <div className="mock__head"><Pill size={18} aria-hidden="true" /><strong>Medicine result</strong><span className="badge badge--demo">Illustration</span></div>
            <div className="mock__row">
              <span className="mock__label">Text read from package</span>
              <code>PARACETAMOL TABLETS 500 mg</code>
              <span className="badge badge--none">Extracted text</span>
            </div>
            <div className="mock__row">
              <span className="mock__label">Possible identification</span>
              <strong>Paracetamol 500 mg</strong>
              <span className="badge badge--ai">AI suggestion</span>
            </div>
            <div className="mock__row">
              <span className="mock__label">Reference database</span>
              <strong>Entry found</strong>
              <span className="badge badge--ok">Reference matched</span>
            </div>
            <div className="mock__row">
              <span className="mock__label">Batch and expiry</span>
              <span className="unavailable">Not visible in photo</span>
              <span className="badge badge--review">Needs review</span>
            </div>
            <figcaption>Each line shows where the information came from.</figcaption>
          </motion.figure>
        </div>
      </section>

      <section className="section container" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="steps__item">
              <span className="steps__num" aria-hidden="true">{i + 1}</span>
              <Icon size={22} aria-hidden="true" />
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container" aria-labelledby="features">
        <h2 id="features">What you can do</h2>
        <motion.div className="feature-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <motion.article key={title} className="card feature" variants={item}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="section container transparency" aria-labelledby="trust">
        <div>
          <h2 id="trust">Honest about what it knows</h2>
          <p>
            Reading text from a photo, suggesting a medicine with AI, and confirming it against reference data are
            three different things. MediGuard AI keeps them separate and never shows a guess as a fact.
          </p>
          <Button to="/about" variant="secondary">Read the safety page</Button>
        </div>
        <ul className="dot-list">
          <li>Missing information is shown as “Information unavailable”, never filled in.</li>
          <li>Every result lists its sources.</li>
          <li>Results marked “Needs review” should be checked with a pharmacist.</li>
          <li>It cannot verify that a medicine is genuine or suitable for you.</li>
        </ul>
      </section>

      <section className="section container" aria-labelledby="faq">
        <h2 id="faq">Frequently asked questions</h2>
        <div className="faq">
          {FAQS.map(([q, a]) => (
            <ExpandableSection key={q} title={q}><p>{a}</p></ExpandableSection>
          ))}
        </div>
      </section>

      <section className="container section"><MedicalDisclaimer /></section>
    </>
  );
}
