import { useState, useEffect } from 'react';
import { stationsApi, predictApi, attributionApi } from '../services/api';
import { useReplay } from '../context/ReplayContext';

export function useStations(selectedStationId, activeCity) {
  const { replayAtDebounced } = useReplay();
  const [selectedStation, setSelectedStation] = useState(null);
  const [trendReadings, setTrendReadings] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [forecastMeta, setForecastMeta] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [attributions, setAttributions] = useState(null);

  useEffect(() => {
    if (!selectedStationId) {
        setSelectedStation(null);
        setTrendReadings([]);
        setForecast([]);
        setForecastMeta(null);
        setExplanation(null);
        setAttributions(null);
        return;
    }

    const loadStationDetails = async () => {
      try {
        const st = await stationsApi.get(selectedStationId);
        setSelectedStation(st);

        const trend = await stationsApi.readings(selectedStationId, 24);
        setTrendReadings(trend);

        const pred = await predictApi.forecast(selectedStationId, 72);
        setForecast(pred.predictions);
        setForecastMeta({
          rmse: pred.rmse, modelVersion: pred.model_version, provenance: pred.provenance,
          asOf: pred.as_of, horizonMetrics: pred.horizon_metrics,
        });

        try {
          const exp = await predictApi.explain(selectedStationId, 24);
          setExplanation(exp);
        } catch (e) { setExplanation(null); }

        const attr = await attributionApi.sources(activeCity, st.zone);
        setAttributions(attr);
      } catch (e) {
        console.error("Error loading station details: ", e);
      }
    };

    loadStationDetails();
  }, [selectedStationId, activeCity, replayAtDebounced]);

  return { selectedStation, setSelectedStation, trendReadings, forecast, forecastMeta, explanation, attributions };
}
