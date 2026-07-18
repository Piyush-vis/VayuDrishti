import React from 'react';

// Polar CPF "pollution rose": wedge length = Conditional Probability Function
// value per 16-point wind sector, i.e. P(high pollution | wind from sector).
// The dominant sector points at where the pollution is coming FROM.
const CX = 80;
const CY = 80;
const R_MAX = 62;
const R_MIN = 6;

function polar(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}

function wedgePath(centreDeg, r) {
  const a0 = centreDeg - 10.5;
  const a1 = centreDeg + 10.5;
  const [x0, y0] = polar(a0, R_MIN);
  const [x1, y1] = polar(a0, r);
  const [x2, y2] = polar(a1, r);
  const [x3, y3] = polar(a1, R_MIN);
  return `M ${x0} ${y0} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${R_MIN} ${R_MIN} 0 0 0 ${x0} ${y0} Z`;
}

const WindRose = ({ windRose }) => {
  if (!windRose || !windRose.valid) return null;
  const dominant = windRose.dominant;

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
        {[0.25, 0.5, 0.75, 1.0].map((f) => (
          <circle key={f} cx={CX} cy={CY} r={R_MIN + f * (R_MAX - R_MIN)}
            fill="none" stroke="#334155" strokeWidth="0.6" strokeDasharray="2 3" />
        ))}
        {windRose.sectors.map((s) => {
          const cpf = s.cpf;
          const isDominant = dominant && s.sector === dominant.sector;
          const r = cpf === null || cpf === undefined
            ? R_MIN + 1.5
            : R_MIN + cpf * (R_MAX - R_MIN);
          return (
            <path
              key={s.sector}
              d={wedgePath(s.centre_deg, Math.max(r, R_MIN + 1))}
              fill={isDominant ? '#a855f7' : cpf ? '#3b82f6' : '#475569'}
              fillOpacity={isDominant ? 0.9 : cpf ? 0.55 : 0.35}
              stroke={isDominant ? '#c084fc' : 'none'}
              strokeWidth={isDominant ? 1 : 0}
            >
              <title>{`${s.sector}: CPF ${cpf === null || cpf === undefined ? 'n/a (low sample)' : cpf} · ${s.hours}h · mean ${s.mean_conc ?? '–'} µg/m³`}</title>
            </path>
          );
        })}
        {['N', 'E', 'S', 'W'].map((lbl, i) => {
          const [x, y] = polar(i * 90, R_MAX + 9);
          return (
            <text key={lbl} x={x} y={y + 3} textAnchor="middle"
              className="fill-slate-400" fontSize="9" fontWeight="700">{lbl}</text>
          );
        })}
      </svg>
      <div className="text-[10px] text-slate-400 leading-relaxed min-w-0">
        <div className="font-bold text-slate-200 uppercase tracking-wider text-[9px] mb-1">CPF Pollution Rose</div>
        {dominant && (
          <div>
            High-pollution wind sector: <span className="font-bold text-purple-300">{dominant.sector}</span>{' '}
            (CPF <span className="font-bold text-purple-300">{Math.round(dominant.cpf * 100)}%</span>)
          </div>
        )}
        <div className="mt-1 text-slate-500">
          P(PM2.5 ≥ {windRose.threshold_ug_m3} µg/m³ | wind from sector), {windRose.n_observations}h window
        </div>
      </div>
    </div>
  );
};

export default WindRose;
