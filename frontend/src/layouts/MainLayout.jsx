import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DemoBanner from '../components/DemoBanner';

// Wraps every page: banner, navbar, animated page area (<Outlet/> = the current route's page), footer.
export default function MainLayout() {
  const location = useLocation();
  // Capture the page element at render time. Using the Outlet component directly inside the fading-out <main> would make the
  // OLD wrapper show the NEW page for a moment, then remount it (wiping anything typed in a form during the 150ms fade).
  const outlet = useOutlet();
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <DemoBanner />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          id="main" key={location.pathname} tabIndex={-1}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
