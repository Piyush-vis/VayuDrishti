import React from 'react';

const LoadingSpinner = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-blue-500 border-r-transparent border-b-slate-700 border-l-slate-700 ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;
