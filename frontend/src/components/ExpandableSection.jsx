import { useState, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Click/keyboard-toggle section. aria-expanded + aria-controls tell screen readers its state.
export default function ExpandableSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="expand">
      <h3 style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 'inherit' }}>
        <button type="button" className="expand__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {Icon && <Icon size={20} aria-hidden="true" />}
          {title}
          <ChevronDown className="chev" size={20} aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} role="region" aria-label={title} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div className="expand__body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
