export const CITIES = {
  delhi: { lat: 28.6139, lon: 77.2090, name: "Delhi", defaultZone: "East Delhi" },
  mumbai: { lat: 19.0760, lon: 72.8777, name: "Mumbai", defaultZone: "Mumbai Suburbs" },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: "Bengaluru", defaultZone: "South Bengaluru" },
  kolkata: { lat: 22.5726, lon: 88.3639, name: "Kolkata", defaultZone: "Central Kolkata" },
  chennai: { lat: 13.0827, lon: 80.2707, name: "Chennai", defaultZone: "South Chennai" },
  hyderabad: { lat: 17.3850, lon: 78.4867, name: "Hyderabad", defaultZone: "Central Hyderabad" },
  lucknow: { lat: 26.8467, lon: 80.9462, name: "Lucknow", defaultZone: "Central Lucknow" },
  jabalpur: { lat: 23.1815, lon: 79.9864, name: "Jabalpur", defaultZone: "Central Jabalpur" }
};

export const AQI_CATEGORIES = [
  { min: 0, max: 50, label: "Good", color: "#00b050", textColor: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", health: "Minimal impact." },
  { min: 51, max: 100, label: "Satisfactory", color: "#92d050", textColor: "text-lime-400", bgColor: "bg-lime-500/10", borderColor: "border-lime-500/30", health: "Minor breathing discomfort for sensitive people." },
  { min: 101, max: 200, label: "Moderate", color: "#ffff00", textColor: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", health: "Breathing discomfort for asthma/heart patients." },
  { min: 201, max: 300, label: "Poor", color: "#ff9900", textColor: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", health: "Breathing discomfort on prolonged exposure." },
  { min: 301, max: 400, label: "Very Poor", color: "#ff0000", textColor: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", health: "Respiratory illness on prolonged exposure." },
  { min: 401, max: 500, label: "Severe", color: "#990000", textColor: "text-red-600", bgColor: "bg-red-950/20", borderColor: "border-red-900/40", health: "Affects healthy people, serious impact on ill." }
];

export const getAqiCategory = (aqi) => {
  const rounded = Math.round(aqi);
  for (const cat of AQI_CATEGORIES) {
    if (rounded >= cat.min && (rounded <= cat.max || cat.max === 500)) {
      return cat;
    }
  }
  // Severe overflow fallback
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
};
