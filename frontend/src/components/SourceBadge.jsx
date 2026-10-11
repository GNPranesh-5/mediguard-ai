import { BookOpen } from 'lucide-react';

// One information source. If the source has a URL it becomes a link that opens in a new tab.
export default function SourceBadge({ source }) {
  const inner = <><BookOpen size={14} aria-hidden="true" />{source.name}</>;
  return source.url
    ? <a className="badge badge--none" href={source.url} target="_blank" rel="noreferrer">{inner}</a>
    : <span className="badge badge--none">{inner}</span>;
}
