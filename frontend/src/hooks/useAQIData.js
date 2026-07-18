import { useState, useEffect } from 'react';
import { aqiApi, advisoryApi, predictApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';

export function useAQIData(activeCity) {
  const { replayAtDebounced } = useReplay();
  const [stations, setStations] = useState([]);
  const [currentReadings, setCurrentReadings] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [syncTime, setSyncTime] = useState(new Date());

  const fetchBaseData = async () => {
    try {
      const currentData = await aqiApi.current(activeCity);
      setCurrentReadings(currentData);
      setStations(currentData.map(d => d.station));
      
      const heatData = await aqiApi.heatmap(activeCity);
      setHeatmapPoints(heatData);
      
      const vulData = await advisoryApi.vulnerabilityMap(activeCity);
      setVulnerabilities(vulData);
      
      const activeAlerts = await predictApi.alerts(activeCity);
      setAlerts(activeAlerts);
      
      setSyncTime(new Date());
    } catch (e) {
      console.error("Error loading base layout data: ", e);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, [activeCity, replayAtDebounced]);

  return { stations, currentReadings, setCurrentReadings, heatmapPoints, vulnerabilities, alerts, syncTime, fetchBaseData };
}
