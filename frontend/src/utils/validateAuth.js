// Form validation for login/register. Each function returns an error string, or '' when the value is fine.
// The backend must validate again; these checks only give instant feedback.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateName = (v) => (v.trim().length < 2 ? 'Enter your full name.' : '');
export const validateEmail = (v) => {
  if (!v.trim()) return 'Enter your email address.';
  return EMAIL_PATTERN.test(v.trim()) ? '' : 'Enter a valid email, like name@example.com.';
};
export const validateNewPassword = (v) => {
  if (!v) return 'Create a password.';
  if (v.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number.';
  return '';
};
export const validateConfirm = (password, confirm) => {
  if (!confirm) return 'Re-enter your password.';
  return password === confirm ? '' : 'Passwords do not match.';
};
