import { Link } from 'react-router-dom';
import { ShieldPlus } from 'lucide-react';

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="MediGuard AI home">
      <span className="logo__mark"><ShieldPlus size={19} aria-hidden="true" /></span>
      <span>MediGuard <small>AI</small></span>
    </Link>
  );
}
