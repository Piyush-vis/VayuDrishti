import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '@mui/material/styles';
import { getAqiCategory } from '../../utils/constants';

// Fire-detection icon for stubble-burning back-trajectory fusion
const fireIcon = L.divIcon({
  html: '<div style="font-size:16px;line-height:1;filter:drop-shadow(0 0 3px rgba(0,0,0,0.6))">🔥</div>',
  className: 'fire-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Fix for default Leaflet icon marker assets in Vite
const createCustomMarkerIcon = (aqi, category) => {
  const isSevere = aqi > 300;
  const pulseClass = isSevere ? 'pulse-marker-severe' : '';
  const color = category.color;
  
  const svgHtml = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
      <div class="${pulseClass}" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}22; border: 2px solid ${color};"></div>
      <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #0F172A; background-color: ${color};">
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

const MapRecenter = ({ center }) => {
  const map = useMap();
  const [prevCenter, setPrevCenter] = useState(null);
  
  useEffect(() => {
    if (center) {
      const centerChanged = !prevCenter || prevCenter[0] !== center[0] || prevCenter[1] !== center[1];
      if (centerChanged) {
        map.setView(center, map.getZoom());
        setPrevCenter(center);
      }
    }
  }, [center, map, prevCenter]);
  return null;
};

const MapAutoResize = () => {
  const map = useMap();
  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
};

// Heatmap Layer inside MapContainer
const LeafletHeatmap = ({ points, visible }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !visible || !points || points.length === 0) return;

    let heatLayer = null;
    import('leaflet.heat')
      .then(() => {
        if (!map || !visible) return;
        // Use raw AQI value as intensity — max=500 so the full AQI scale maps to full heat
        const heatData = points.map((p) => [
          p.lat,
          p.lng ?? p.lon,
          p.value ?? p.aqi ?? (p.intensity != null ? p.intensity * 500 : 250),
        ]);

        heatLayer = L.heatLayer(heatData, {
          radius: 80,       // large radius so blobs overlap and merge across a city
          blur: 55,         // heavy blur for smooth continuous gradient
          maxZoom: 13,
          max: 500,         // raw AQI scale (0–500)
          minOpacity: 0.45, // prevent fully invisible blobs
          gradient: {
            0.0: '#10B981', // Good  (0–50)
            0.2: '#84CC16', // Satisfactory (51–100)
            0.4: '#F59E0B', // Moderate (101–200)
            0.6: '#F97316', // Poor (201–300)
            0.8: '#EF4444', // Very Poor (301–400)
            1.0: '#A855F7', // Severe (400+)
          },
        }).addTo(map);
      })
      .catch((err) => console.error('Failed to load leaflet.heat:', err));

    return () => {
      if (heatLayer && map) {
        try {
          map.removeLayer(heatLayer);
        } catch (_) {}
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
  onStationSelect,
  trajectory,
  showTrajectory,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // CartoDB Voyager for high-clarity visible roads and slate terrain in dark/light mode
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const getVulnerableIcon = (type) => {
    const t = (type || '').toLowerCase();
    const isSchool = t === 'school';
    const color = isSchool ? '#3B82F6' : t.includes('hospital') ? '#EF4444' : '#F59E0B';
    const svg = isSchool ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ` : `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    `;
    
    return L.divIcon({
      html: `<div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${svg}</div>`,
      className: 'vulnerable-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={11}
        zoomControl={false}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        style={{ height: '100%', width: '100%', background: isDark ? '#1E293B' : '#F8FAFC' }}
      >
        {/* Zoom controls at topleft */}
        <ZoomControl position="topleft" />

        {/* CartoDB High-Clarity Themed Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />

        <MapRecenter center={center} />
        <MapAutoResize />

        {/* Heatmap overlay */}
        <LeafletHeatmap points={heatmapPoints} visible={showHeatmap} />

        {/* Active CAAQMS Station Markers */}
        {!showHeatmap && stations && stations.map((stationData) => {
          const station = stationData.station;
          const reading = stationData.reading;
          if (!station || !reading) return null;
          
          const cat = getAqiCategory(reading.aqi);
          const icon = createCustomMarkerIcon(reading.aqi, cat);
          const isLive = reading.source?.startsWith('live') || reading.source === 'api';

          return (
            <Marker
              key={station.station_id}
              position={[station.latitude, station.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onStationSelect(station.station_id),
              }}
            >
              <Popup className="custom-aqi-popup">
                <div style={{ padding: '8px 10px', minWidth: '220px', maxWidth: '270px', fontFamily: 'Inter, sans-serif' }}>
                  {/* Station Name & Live Source Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                        {station.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        {station.zone ? `${station.zone} · ` : ''}{station.city ? station.city.toUpperCase() : 'DELHI'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '8.5px',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      backgroundColor: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: isLive ? '#10B981' : (isDark ? '#94A3B8' : '#64748B'),
                      border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {reading.source?.replace('live:', '⚡ ') || 'Sensor'}
                    </span>
                  </div>

                  {/* Hero AQI row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '8px 0',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.85)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: cat.color, fontFamily: 'monospace', lineHeight: 1 }}>
                        {Math.round(reading.aqi)}
                      </span>
                      <span style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }}>AQI</span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: cat.color,
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      boxShadow: `0 2px 8px ${cat.color}55`,
                    }}>
                      {cat.label}
                    </span>
                  </div>

                  {/* 6 Pollutants Comprehensive Grid */}
                  <div style={{
                    fontSize: '11px',
                    borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                    paddingTop: '6px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px 8px',
                    color: isDark ? '#CBD5E1' : '#334155',
                  }}>
                    <div>PM2.5: <b style={{ fontFamily: 'monospace' }}>{reading.pm25}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>µg/m³</span></div>
                    <div>PM10: <b style={{ fontFamily: 'monospace' }}>{reading.pm10}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>µg/m³</span></div>
                    <div>NO2: <b style={{ fontFamily: 'monospace' }}>{reading.no2}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>µg/m³</span></div>
                    <div>SO2: <b style={{ fontFamily: 'monospace' }}>{reading.so2}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>µg/m³</span></div>
                    <div>CO: <b style={{ fontFamily: 'monospace' }}>{reading.co}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>mg/m³</span></div>
                    <div>O3: <b style={{ fontFamily: 'monospace' }}>{reading.o3}</b> <span style={{ fontSize: '9px', opacity: 0.7 }}>µg/m³</span></div>
                  </div>

                  {/* Live Weather Strip */}
                  {(reading.temperature != null || reading.humidity != null || reading.wind_speed != null) && (
                    <div style={{
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: isDark ? '#94A3B8' : '#64748B',
                      fontWeight: 600,
                    }}>
                      {reading.temperature != null && <span>🌡️ {reading.temperature}°C</span>}
                      {reading.humidity != null && <span>💧 {reading.humidity}%</span>}
                      {reading.wind_speed != null && <span>💨 {reading.wind_speed} km/h</span>}
                    </div>
                  )}

                  {/* Health Advisory note */}
                  {cat.health && (
                    <div style={{
                      marginTop: '6px',
                      paddingTop: '4px',
                      fontSize: '10px',
                      color: cat.color,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}>
                      ⚠️ {cat.health}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* HYSPLIT-lite back-trajectory + fire-detection fusion overlay */}
        {showTrajectory && trajectory && trajectory.path && trajectory.path.length > 1 && (
          <>
            <Polyline
              positions={trajectory.path.map((p) => [p.lat, p.lon])}
              pathOptions={{ color: '#00B4D8', weight: 3, opacity: 0.9, dashArray: '6 6' }}
            />
            {/* Full fire field (dim) */}
            {trajectory.all_fires && trajectory.all_fires.map((f, i) => (
              <CircleMarker
                key={`fa-${i}`}
                center={[f.lat, f.lon]}
                radius={3}
                pathOptions={{ color: '#F97316', fillColor: '#F97316', fillOpacity: 0.4, weight: 0 }}
              />
            ))}
            {/* Crossed fires (bright) */}
            {trajectory.intersections && trajectory.intersections.map((f, i) => (
              <Marker key={`fx-${i}`} position={[f.lat, f.lon]} icon={fireIcon}>
                <Popup>
                  <div style={{ padding: '4px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 700 }}>Active fire — {f.district}</div>
                    <div style={{ color: '#64748B' }}>Crossed air mass ~{f.hours_ago}h upwind</div>
                    {f.frp != null && <div style={{ color: '#64748B' }}>FRP: {f.frp} MW · {f.distance_km} km off-path</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* Receptor endpoint marker */}
            <CircleMarker
              center={[trajectory.origin.lat, trajectory.origin.lon]}
              radius={6}
              pathOptions={{ color: '#00B4D8', fillColor: '#03DAC6', fillOpacity: 0.9 }}
            />
          </>
        )}

        {/* Vulnerability overlays (schools, hospitals) */}
        {showVulnerabilities && vulnerabilities && vulnerabilities.map((item, idx) => (
          <Marker
            key={idx}
            position={[item.lat, item.lon]}
            icon={getVulnerableIcon(item.type)}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155' }}>
                  {item.type}
                </span>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>{item.name}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default AQIMap;
