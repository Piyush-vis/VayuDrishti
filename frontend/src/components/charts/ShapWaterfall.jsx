import React from 'react';

const ShapWaterfall = ({ explanation }) => {
  if (!explanation || !explanation.available) {
    return (
      <div className="text-xs text-[var(--text-muted)] p-3 text-center">
        Explainability telemetry unavailable for this forecast.
      </div>
    );
  }
  const { base_value, predicted_aqi, top_factors, horizon_hours } = explanation;
  const maxAbs = Math.max(...top_factors.map((f) => Math.abs(f.contribution)), 1);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs font-mono px-1 py-1.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
        <span className="text-[var(--text-secondary)]">
          Base: <span className="font-bold text-[var(--text-primary)]">{base_value}</span>
        </span>
        <span className="text-[var(--accent-sky)] font-bold">
          → H+{horizon_hours}h Forecast: <span className="text-[var(--text-primary)]">{predicted_aqi}</span>
        </span>
      </div>

      <div className="space-y-2">
        {top_factors.map((f, i) => {
          const pos = f.contribution >= 0;
          const widthPct = Math.min((Math.abs(f.contribution) / maxAbs) * 45, 45);

          return (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div
                className="w-32 shrink-0 text-right text-[var(--text-secondary)] font-medium truncate"
                title={`${f.label} = ${f.value}`}
              >
                {f.label}
              </div>
              <div className="flex-1 flex items-center h-5 relative bg-[var(--bg-surface-elevated)] rounded">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-active)]" />
                {pos ? (
                  <div
                    className="absolute left-1/2 h-3.5 rounded-r bg-[var(--accent-crimson)] shadow-sm"
                    style={{ width: `${widthPct}%` }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 h-3.5 rounded-l bg-[var(--accent-emerald)] shadow-sm"
                    style={{ width: `${widthPct}%` }}
                  />
                )}
              </div>
              <div
                className={`w-12 shrink-0 font-mono font-bold text-right ${
                  pos ? 'text-[var(--accent-crimson)]' : 'text-[var(--accent-emerald)]'
                }`}
              >
                {pos ? '+' : ''}{f.contribution}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-crimson)]" /> Increases AQI (Worsens)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-emerald)]" /> Decreases AQI (Improves)
        </span>
      </div>
    </div>
  );
};

export default ShapWaterfall;
