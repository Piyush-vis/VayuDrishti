import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAqiCategory } from '../../utils/constants';

// Fix for default Leaflet icon marker assets in Vite
// We override the default icon using a custom SVG marker
const createCustomMarkerIcon = (aqi, category) => {
  const isSevere = aqi > 300;
  const pulseClass = isSevere ? 'pulse-marker-severe' : '';
  const color = category.color;
  
  const svgHtml = `
    <div class="relative flex items-center justify-center w-10 h-10">
      <div class="absolute w-8 h-8 rounded-full ${pulseClass}" style="background-color: ${color}22; border: 2px solid ${color};"></div>
      <div class="absolute w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900" style="background-color: ${color};">
        ${Math.round(aqi)}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-aqi-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Component to handle map centering when city changes
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Heatmap Layer inside MapContainer
const LeafletHeatmap = ({ points, visible }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !visible || !points || points.length === 0) return;
    
    // Import leaflet.heat dynamically to avoid bundler issues
    let heatLayer = null;
    
    const loadHeat = async () => {
      try {
        // Ensure leaflet.heat is loaded
        await import('leaflet.heat');
        
        const heatPoints = points.map(p => [p.lat, p.lng, p.value * 1.5]); // scale intensity
        
        heatLayer = L.heatLayer(heatPoints, {
          radius: 35,
          blur: 20,
          maxZoom: 10,
          max: 400.0,
          gradient: {
            0.1: '#00b050',      // Good (green)
            0.25: '#92d050',     // Satisfactory
            0.5: '#ffff00',      // Moderate
            0.7: '#ff9900',      // Poor
            0.85: '#ff0000',     // Very Poor
            1.0: '#990000'       // Severe
          }
        }).addTo(map);
      } catch (err) {
        console.error("Failed to load Leaflet.heat plugin: ", err);
      }
    };

    loadHeat();

    return () => {
      if (heatLayer && map) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points, visible]);

  return null;
};

const AQIMap = ({ 
  stations, 
  center, 
  heatmapPoints, 
  showHeatmap, 
  vulnerabilities, 
  showVulnerabilities, 
  onStationSelect 
}) => {
  
  // Custom marker for vulnerable points (schools/hospitals)
  const getVulnerableIcon = (type) => {
    const isHospital = type === 'Hospital';
    const isSchool = type === 'School';
    const color = isHospital ? '#ef4444' : (isSchool ? '#3b82f6' : '#f59e0b');
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `;
    
    return L.divIcon({
      html: `<div class="w-6 h-6 flex items-center justify-center">${svg}</div>`,
      className: 'vulnerable-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="w-full h-full"
      >
        {/* Dark Mode Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-tiles"
        />

        <MapRecenter center={center} />

        {/* Heatmap overlay */}
        <LeafletHeatmap points={heatmapPoints} visible={showHeatmap} />

        {/* Active CAAQMS Station Markers */}
        {!showHeatmap && stations && stations.map((stationData) => {
          const station = stationData.station;
          const reading = stationData.reading;
          if (!station || !reading) return null;
          
          const cat = getAqiCategory(reading.aqi);
          const icon = createCustomMarkerIcon(reading.aqi, cat);

          return (
            <Marker
              key={station.station_id}
              position={[station.latitude, station.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onStationSelect(station.station_id),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">{station.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{station.zone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black" style={{ color: cat.color }}>
                      {reading.aqi}
                    </div>
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: cat.color + '22', color: cat.color }}>
                        {cat.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1 border-t border-slate-800 text-slate-300 font-medium">
                    <div>PM2.5: <span className="font-mono text-slate-100 font-semibold">{reading.pm25} µg/m³</span></div>
                    <div>PM10: <span className="font-mono text-slate-100 font-semibold">{reading.pm10} µg/m³</span></div>
                    <div>NO2: <span className="font-mono text-slate-100 font-semibold">{reading.no2} µg/m³</span></div>
                    <div>SO2: <span className="font-mono text-slate-100 font-semibold">{reading.so2} µg/m³</span></div>
                    <div>Temp: <span className="font-mono text-slate-100 font-semibold">{reading.temperature}°C</span></div>
                    <div>Wind: <span className="font-mono text-slate-100 font-semibold">{reading.wind_speed} km/h</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Vulnerability overlays (schools, hospitals) */}
        {showVulnerabilities && vulnerabilities && vulnerabilities.map((item, idx) => (
          <Marker
            key={idx}
            position={[item.lat, item.lon]}
            icon={getVulnerableIcon(item.type)}
          >
            <Popup>
              <div className="p-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {item.type}
                </span>
                <h4 className="text-xs font-bold text-white mt-1.5">{item.name}</h4>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default AQIMap;
