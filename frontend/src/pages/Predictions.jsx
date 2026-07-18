import { motion } from 'framer-motion';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import PredictionChart from '../components/charts/PredictionChart';
import AlertCard from '../components/common/AlertCard';

function Predictions({ selectedStation, forecast, forecastMeta, alerts }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 w-full"
    >
      <div className="glass-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">72-Hour Predictive AQI Forecast</h2>
          <p className="text-xs text-slate-400">Autoregressive XGBoost model predicting trends with 80% confidence interval bands</p>
        </div>
        
        {selectedStation ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-4 bg-slate-900/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">72-Hour Forecast (AQI vs Time)</h3>
              <PredictionChart data={forecast} />
            </div>
            
            <div className="space-y-4">
              <div className="glass-card p-4 space-y-3 bg-slate-900/30">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Prediction Summary</h4>
                <div className="space-y-2 text-xs text-slate-300 font-medium">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Target Station:</span>
                    <span className="font-bold text-white">{selectedStation.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Max Predicted AQI:</span>
                    <span className="font-bold text-red-400">
                      {forecast.length > 0 ? Math.max(...forecast.map(f => f.aqi)) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Base Model RMSE:</span>
                    <span className="font-bold text-blue-300">
                      {forecastMeta?.rmse != null ? `± ${forecastMeta.rmse.toFixed(1)} AQI` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Model Engine:</span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {forecastMeta?.modelVersion === 'statistical_fallback' ? 'Statistical Fallback' : (forecastMeta?.modelVersion || 'N/A')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="glass-card p-4 space-y-3 border-l-4 border-l-red-500 bg-red-950/10">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Active Forecast Alerts</h4>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400">No critical threshold breaches predicted for next 72 hours.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {alerts.map((alert, idx) => (
                      <AlertCard
                        key={idx}
                        type={alert.predicted_aqi >= 400 ? 'critical' : 'warning'}
                        title={alert.zone}
                        message={`Predicted to breach threshold at ${new Date(alert.predicted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} (Expected AQI: ${alert.predicted_aqi})`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            Please select a station in the Command Center tab to analyze predictions.
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Predictions;
