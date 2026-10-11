import { IMAGE_RULES } from '../config';

// Returns an error message string, or null when the file is acceptable.
// This is only a convenience check; the backend must validate again.
export function validateImage(file) {
  if (!file) return 'No file selected.';
  if (!IMAGE_RULES.allowedTypes.includes(file.type)) {
    return `"${file.name}" is not supported. Use ${IMAGE_RULES.allowedLabel}.`;
  }
  if (file.size > IMAGE_RULES.maxBytes) {
    return `"${file.name}" is larger than ${IMAGE_RULES.maxLabel}. Choose a smaller photo.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  return null;
}
