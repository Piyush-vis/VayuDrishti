import React from 'react';
import { getAqiCategory } from '../../utils/constants';

const AQIBadge = ({ aqi, showLabel = true, size = 'md', className = '' }) => {
  const cat = getAqiCategory(aqi);
  if (!cat) return null;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md font-heading font-semibold border ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{
        backgroundColor: `${cat.color}15`,
        borderColor: `${cat.color}40`,
        color: cat.color,
      }}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0 shadow-sm"
        style={{ backgroundColor: cat.color }}
      />
      {showLabel && (
        <span className="leading-none">
          {cat.label} <span className="font-mono opacity-90">({Math.round(aqi)})</span>
        </span>
      )}
    </div>
  );
};

export default AQIBadge;
