import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between text-xs text-[var(--text-muted)] w-full shrink-0 transition-colors">
      <div className="flex items-center gap-2">
        <span className="font-heading font-semibold text-[var(--text-primary)]">VayuDrishti</span>
        <span>· National Air Quality Intelligence & Planetary Decision Platform</span>
      </div>
      <div className="font-mono text-[11px]">
        <span>CPCB & MoEFCC Compliant Architecture © 2026</span>
      </div>
    </footer>
  );
};

export default Footer;
