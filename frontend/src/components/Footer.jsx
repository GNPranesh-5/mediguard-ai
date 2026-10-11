import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Logo />
            <p style={{ marginTop: 12 }}>Understand Your Medicine. Make Informed Decisions.</p>
          </div>
          <div>
            <h4>Use MediGuard</h4>
            <ul>
              <li><Link to="/scan">Scan a medicine</Link></li>
              <li><Link to="/search">Search medicines</Link></li>
              <li><Link to="/history">Scan history</Link></li>
              <li><Link to="/saved">Saved medicines</Link></li>
            </ul>
          </div>
          <div>
            <h4>Learn more</h4>
            <ul>
              <li><Link to="/about">About &amp; safety</Link></li>
              <li><Link to="/settings">Settings</Link></li>
            </ul>
          </div>
        </div>
        <p className="footer__fine">
          MediGuard AI is a college technical training project. It does not give medical advice, diagnose conditions
          or replace a doctor or pharmacist. Always follow your package label and professional guidance.
        </p>
      </div>
    </footer>
  );
}
