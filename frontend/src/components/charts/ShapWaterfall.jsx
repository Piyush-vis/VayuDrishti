import React from 'react';

// SHAP waterfall: how each feature pushed the forecast above/below the model's
// base value. Contributions come from exact TreeSHAP (XGBoost pred_contribs).
const ShapWaterfall = ({ explanation }) => {
  if (!explanation || !explanation.available) {
    return <div className="text-[10px] text-slate-500">Explanation unavailable for this forecast.</div>;
  }
  const { base_value, predicted_aqi, top_factors, horizon_hours } = explanation;
  const maxAbs = Math.max(...top_factors.map((f) => Math.abs(f.contribution)), 1);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Base value <span className="font-mono text-slate-200">{base_value}</span></span>
        <span>→ H+{horizon_hours}h forecast <span className="font-mono font-bold text-white">{predicted_aqi}</span></span>
      </div>
      <div className="space-y-1.5">
        {top_factors.map((f, i) => {
          const pos = f.contribution >= 0;
          const widthPct = (Math.abs(f.contribution) / maxAbs) * 50;
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <div className="w-24 shrink-0 text-right text-slate-400 truncate" title={`${f.label} = ${f.value}`}>
                {f.label}
              </div>
              <div className="flex-1 flex items-center h-4 relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700" />
                {pos ? (
                  <div className="absolute left-1/2 h-3 rounded-r bg-red-500/70" style={{ width: `${widthPct}%` }} />
                ) : (
                  <div className="absolute right-1/2 h-3 rounded-l bg-emerald-500/70" style={{ width: `${widthPct}%` }} />
                )}
              </div>
              <div className={`w-10 shrink-0 font-mono font-bold ${pos ? 'text-red-400' : 'text-emerald-400'}`}>
                {pos ? '+' : ''}{f.contribution}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-slate-600">
        Red pushes AQI up, green pulls it down. Exact TreeSHAP over the XGBoost forecaster.
      </p>
    </div>
  );
};

export default ShapWaterfall;
