export const getAqiColor = (aqi) => {
  if (aqi <= 50) return '#00b050';
  if (aqi <= 100) return '#92d050';
  if (aqi <= 200) return '#ffff00';
  if (aqi <= 300) return '#ff9900';
  if (aqi <= 400) return '#ff0000';
  return '#990000';
};

export const getAqiTextClass = (aqi) => {
  if (aqi <= 50) return 'text-green-400';
  if (aqi <= 100) return 'text-lime-400';
  if (aqi <= 200) return 'text-yellow-400';
  if (aqi <= 300) return 'text-orange-400';
  if (aqi <= 400) return 'text-red-400';
  return 'text-red-600';
};
