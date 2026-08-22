import React from 'react';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const AlertCard = ({ type = 'warning', title, message, actionText, onAction }) => {
  const configs = {
    critical: {
      bg: 'bg-[var(--accent-crimson-subtle)] border-[var(--accent-crimson-border)] text-[var(--text-primary)]',
      iconColor: 'text-[var(--accent-crimson)]',
      Icon: AlertOctagon,
      btn: 'bg-[var(--accent-crimson)] text-white hover:opacity-90'
    },
    warning: {
      bg: 'bg-[var(--accent-amber-subtle)] border-[var(--accent-amber-border)] text-[var(--text-primary)]',
      iconColor: 'text-[var(--accent-amber)]',
      Icon: AlertTriangle,
      btn: 'bg-[var(--accent-amber)] text-slate-950 font-bold hover:opacity-90'
    },
    info: {
      bg: 'bg-[var(--accent-sky-subtle)] border-[var(--accent-sky-border)] text-[var(--text-primary)]',
      iconColor: 'text-[var(--accent-sky)]',
      Icon: Info,
      btn: 'bg-[var(--accent-sky)] text-white hover:opacity-90'
    }
  };

  const config = configs[type] || configs.warning;
  const Icon = config.Icon;

  return (
    <div className={`p-4 rounded-xl border flex gap-3.5 items-start shadow-sm transition-all ${config.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor} mt-0.5`} />
      <div className="flex-1 space-y-1.5">
        {title && <h4 className="text-sm font-heading font-bold leading-tight">{title}</h4>}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
        {actionText && (
          <button 
            onClick={onAction}
            className={`mt-2 px-3 py-1 rounded-md text-xs font-heading font-semibold transition-all active:scale-95 cursor-pointer ${config.btn}`}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
