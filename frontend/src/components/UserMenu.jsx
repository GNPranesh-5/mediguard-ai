import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useLogoutAction } from '../hooks/useAuth';

const initialsOf = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

// Avatar button that opens a small menu with the user's name, email and Logout.
// Works with mouse, touch and keyboard (Enter/Space to open, Escape to close, focus returns to the button).
export default function UserMenu() {
  const { user } = useAuth();
  const logout = useLogoutAction();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="user-menu" ref={wrapRef}>
      <button ref={buttonRef} type="button" className="user-menu__button" aria-expanded={open} aria-controls="user-menu-panel" aria-label={`Account menu for ${user.name}`} onClick={() => setOpen((o) => !o)}>
        <span className="avatar" aria-hidden="true">{initialsOf(user.name)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id="user-menu-panel" className="user-menu__panel">
          <p className="user-menu__name">{user.name}</p>
          <p className="user-menu__email">{user.email}</p>
          <button type="button" className="btn btn--secondary btn--sm btn--block" onClick={logout}><LogOut size={16} aria-hidden="true" />Logout</button>
        </div>
      )}
    </div>
  );
}
