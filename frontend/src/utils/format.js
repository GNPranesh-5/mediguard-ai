export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Maps backend status codes to label + badge style + icon name. One source of truth for all badges.
export const STATUS_INFO = {
  ai_suggestion: { label: 'AI suggestion', tone: 'ai', help: 'Suggested by an AI model. Not confirmed against reference data.' },
  reference_matched: { label: 'Reference matched', tone: 'ok', help: 'Matched to an entry in a trusted reference database.' },
  needs_review: { label: 'Needs review', tone: 'review', help: 'Please check this against the physical package or ask a pharmacist.' },
  not_detected: { label: 'Not detected', tone: 'none', help: 'No medicine could be identified from the image.' },
  unavailable: { label: 'Information unavailable', tone: 'none', help: 'No reference information is available for this field.' },
};
