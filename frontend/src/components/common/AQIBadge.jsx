import React from 'react';
import { getAqiCategory } from '../../utils/constants';

const AQIBadge = ({ aqi, showLabel = true, className = '' }) => {
  const cat = getAqiCategory(aqi);
  
  if (!cat) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span 
        className="h-2 w-2 rounded-full shadow-sm"
        style={{ backgroundColor: cat.color }}
      />
      {showLabel && (
        <span 
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: cat.color }}
        >
          {cat.label} ({Math.round(aqi)})
        </span>
      )}
    </div>
  );
};

export default AQIBadge;
