import { BadgeCheck, Sparkles, AlertCircle, CircleSlash, HelpCircle } from 'lucide-react';
import { STATUS_INFO } from '../utils/format';

const ICONS = { ok: BadgeCheck, ai: Sparkles, review: AlertCircle, none: CircleSlash };

// Displays an identification/verification status (see STATUS_INFO for the 5 allowed values).
export default function VerificationBadge({ status }) {
  const info = STATUS_INFO[status] || { label: 'Unknown status', tone: 'none' };
  const Icon = ICONS[info.tone] || HelpCircle;
  return <span className={`badge badge--${info.tone}`} title={info.help}><Icon size={14} aria-hidden="true" />{info.label}</span>;
}
