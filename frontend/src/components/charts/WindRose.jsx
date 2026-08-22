import React from 'react';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDark } = useTheme();
  if (!windRose || !windRose.valid) return null;
  const dominant = windRose.dominant;

  const circleStroke = isDark ? '#233044' : '#E2E8F0';
  const labelColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
        {[0.25, 0.5, 0.75, 1.0].map((f) => (
          <circle 
            key={f} 
            cx={CX} 
            cy={CY} 
            r={R_MIN + f * (R_MAX - R_MIN)}
            fill="none" 
            stroke={circleStroke} 
            strokeWidth="0.8" 
            strokeDasharray="2 3" 
          />
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
              fill={isDominant ? (isDark ? '#A78BFA' : '#7C3AED') : cpf ? (isDark ? '#38BDF8' : '#0284C7') : (isDark ? '#334155' : '#CBD5E1')}
              fillOpacity={isDominant ? 0.95 : cpf ? 0.6 : 0.4}
              stroke={isDominant ? (isDark ? '#C084FC' : '#6D28D9') : 'none'}
              strokeWidth={isDominant ? 1.5 : 0}
            >
              <title>{`${s.sector}: CPF ${cpf === null || cpf === undefined ? 'n/a' : cpf} · ${s.hours}h · mean ${s.mean_conc ?? '–'} µg/m³`}</title>
            </path>
          );
        })}
        {['N', 'E', 'S', 'W'].map((lbl, i) => {
          const [x, y] = polar(i * 90, R_MAX + 9);
          return (
            <text 
              key={lbl} 
              x={x} 
              y={y + 3} 
              textAnchor="middle"
              fill={labelColor} 
              fontSize="9" 
              fontFamily="var(--font-mono)"
              fontWeight="700"
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      <div className="text-xs space-y-1 min-w-0">
        <p className="font-heading font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
          CPF Pollution Rose
        </p>
        {dominant && (
          <p className="text-xs text-[var(--text-secondary)]">
            Primary Inflow: <span className="font-bold text-[var(--accent-purple)]">{dominant.sector}</span>{' '}
            (CPF <span className="font-mono font-bold text-[var(--text-primary)]">{Math.round(dominant.cpf * 100)}%</span>)
          </p>
        )}
        <p className="text-[11px] text-[var(--text-muted)] leading-tight">
          P(PM2.5 ≥ {windRose.threshold_ug_m3} µg/m³ | sector wind)
        </p>
      </div>
    </div>
  );
};

export default WindRose;
