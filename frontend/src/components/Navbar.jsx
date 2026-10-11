import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScanLine, Search, History, Bookmark, Info, Settings, Menu, X, LogIn, UserPlus, LogOut } from 'lucide-react';
import Logo from './Logo';
import Button from './Button';
import UserMenu from './UserMenu';
import { useAuth, useLogoutAction } from '../hooks/useAuth';

const MAIN_LINKS = [
  { to: '/scan', label: 'Scan', icon: ScanLine },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/history', label: 'History', icon: History },
  { to: '/saved', label: 'Saved', icon: Bookmark },
];
const EXTRA_LINKS = [
  { to: '/about', label: 'About & safety', icon: Info },
  { to: '/settings', label: 'Settings', icon: Settings },
];
const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

// Desktop: links in the top bar. Mobile: hamburger menu for secondary pages + a bottom tab bar for the 4 main ones.
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const logout = useLogoutAction();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="navbar">
        <div className="container navbar__inner">
          <Logo />
          <nav className="nav-links" aria-label="Main">
            {[...MAIN_LINKS, ...EXTRA_LINKS].map(({ to, label }) => (
              <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>
            ))}
          </nav>
          <div className="nav-auth">
            {isAuthenticated ? <UserMenu /> : (
              <>
                <Button to="/login" variant="ghost" size="sm">Log in</Button>
                <Button to="/register" variant="secondary" size="sm">Register</Button>
              </>
            )}
          </div>
          <Button
            variant="ghost" className="nav-toggle" icon={menuOpen ? X : Menu}
            aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          />
        </div>
        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              id="mobile-menu" className="mobile-menu" aria-label="More pages"
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }}
            >
              {EXTRA_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}><Icon size={20} aria-hidden="true" />{label}</NavLink>
              ))}
              {isAuthenticated ? (
                <>
                  <p className="mobile-menu__user"><strong>{user.name}</strong><span>{user.email}</span></p>
                  <button type="button" className="mobile-menu__btn" onClick={logout}><LogOut size={20} aria-hidden="true" />Logout</button>
                </>
              ) : (
                <>
                  <NavLink to="/login"><LogIn size={20} aria-hidden="true" />Log in</NavLink>
                  <NavLink to="/register"><UserPlus size={20} aria-hidden="true" />Register</NavLink>
                </>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <nav className="tabbar" aria-label="Quick navigation">
        {MAIN_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={22} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
