import React from 'react';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const AlertCard = ({ type = 'warning', title, message, actionText, onAction }) => {
  const configs = {
    critical: {
      bg: 'bg-red-950/20 border-red-500/30 text-red-200',
      iconColor: 'text-red-500',
      Icon: AlertOctagon,
      btn: 'bg-red-600 hover:bg-red-500 text-white border-red-600/30'
    },
    warning: {
      bg: 'bg-yellow-950/10 border-yellow-500/20 text-yellow-200',
      iconColor: 'text-yellow-500',
      Icon: AlertTriangle,
      btn: 'bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-600/30'
    },
    info: {
      bg: 'bg-blue-950/20 border-blue-500/30 text-blue-200',
      iconColor: 'text-blue-500',
      Icon: Info,
      btn: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600/30'
    }
  };

  const config = configs[type] || configs.warning;
  const Icon = config.Icon;

  return (
    <div className={`p-4 rounded-xl border flex gap-3 items-start backdrop-blur-sm ${config.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor} mt-0.5`} />
      <div className="flex-1 space-y-2">
        {title && <h4 className="text-sm font-bold text-white leading-tight">{title}</h4>}
        <p className="text-xs leading-normal opacity-90">{message}</p>
        {actionText && (
          <button 
            onClick={onAction}
            className={`mt-1.5 px-3 py-1 rounded text-[10px] font-bold border transition-all active:scale-95 ${config.btn}`}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
