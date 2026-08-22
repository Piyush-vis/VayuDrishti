import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Landmark, TimerReset } from 'lucide-react';
import { grapApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import ProvenanceBadge from '../common/ProvenanceBadge';
import LoadingSpinner from '../common/LoadingSpinner';

const STAGE_COLORS = {
  0: { text: 'text-[var(--accent-emerald)]', border: 'border-[var(--accent-emerald-border)]', bg: 'bg-[var(--accent-emerald-subtle)]' },
  1: { text: 'text-[var(--accent-amber)]', border: 'border-[var(--accent-amber-border)]', bg: 'bg-[var(--accent-amber-subtle)]' },
  2: { text: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  3: { text: 'text-[var(--accent-crimson)]', border: 'border-[var(--accent-crimson-border)]', bg: 'bg-[var(--accent-crimson-subtle)]' },
  4: { text: 'text-[var(--accent-purple)]', border: 'border-[var(--accent-purple-border)]', bg: 'bg-[var(--accent-purple-subtle)]' },
};

const SIGNAL_LABELS = {
  model_forecast: 'XGBoost multi-horizon forecast',
  trend_projection: 'Trend projection (24h regression)',
  observed: 'Observed threshold breach',
};

const GRAPPanel = ({ city }) => {
  const { replayAtDebounced } = useReplay();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setLoading(true);
    grapApi.status(city)
      .then((d) => { if (!cancelled) setStatus(d); })
      .catch((e) => console.error('GRAP status failed:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city, replayAtDebounced]);

  if (loading && !status) {
    return (
      <div className="bento-card p-6 flex flex-col items-center justify-center h-36 gap-2">
        <LoadingSpinner size="small" />
        <span className="text-xs text-[var(--text-muted)] font-heading font-semibold">Evaluating GRAP statutory triggers...</span>
      </div>
    );
  }
  if (!status) return null;

  const invoking = status.recommendation === 'INVOKE_IN_ADVANCE';
  const activeStage = invoking ? status.projected_stage : status.current_stage;
  const col = STAGE_COLORS[activeStage] || STAGE_COLORS[0];
  const order = status.draft_order;

  return (
    <div className="bento-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[var(--accent-emerald)]" />
            <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
              GRAP Emergency Trigger Engine
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {status.is_ncr_statutory
              ? 'Statutory CAQM instrument · Automated advance-invocation order generator'
              : 'Advisory mode (Statutory in Delhi-NCR) · Same threshold engine'}
          </p>
        </div>
        <ProvenanceBadge source={status.provenance === 'replay' ? 'replay' : 'live'} />
      </div>

      {/* Stage ladder */}
      <div className="flex items-center gap-2">
        <div className="text-center px-2 py-1 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] mr-1">
          <div className={`text-2xl font-mono font-bold ${col.text}`}>{status.city_index?.current ?? '–'}</div>
          <div className="text-[10px] font-heading font-bold uppercase text-[var(--text-muted)]">City Index</div>
        </div>
        {[1, 2, 3, 4].map((s) => {
          const isCurrent = status.current_stage === s;
          const isProjected = invoking && status.projected_stage === s;
          const c = STAGE_COLORS[s];
          return (
            <div
              key={s}
              className={`flex-1 rounded-lg border px-2 py-2 text-center transition-all ${
                isCurrent
                  ? `${c.border} ${c.bg} ring-1 ring-inset ring-current ${c.text}`
                  : isProjected
                  ? `${c.border} ${c.bg} ${c.text} animate-pulse`
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'
              }`}
              title={`${s === 1 ? 'AQI 201-300 (Stage I)' : s === 2 ? 'AQI 301-400 (Stage II)' : s === 3 ? 'AQI 401-450 (Stage III)' : 'AQI >450 (Stage IV)'}`}
            >
              <div className="text-xs font-mono font-bold">{['I', 'II', 'III', 'IV'][s - 1]}</div>
              <div className="text-[10px] font-heading font-semibold uppercase tracking-wider">
                {['Poor', 'V. Poor', 'Severe', 'Severe+'][s - 1]}
              </div>
              {isCurrent && <div className="text-[10px] font-bold mt-0.5">ACTIVE</div>}
              {isProjected && <div className="text-[10px] font-bold mt-0.5">PROJECTED</div>}
            </div>
          );
        })}
      </div>

      {/* Advance-invocation alert */}
      {invoking && (
        <div className="rounded-lg border border-[var(--accent-crimson-border)] bg-[var(--accent-crimson-subtle)] p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent-crimson)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-heading font-extrabold uppercase tracking-wider">
              Forecast crosses {order?.basis?.threshold} in ~{status.crossing_eta_hours}h — Advance Invocation Drafted
            </span>
          </div>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">{status.rationale}</p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <span className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[var(--accent-amber)]">
              <TimerReset className="h-3.5 w-3.5" />
              Lead Time Gained: {status.lead_time_hours}h before actual crossing
            </span>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
              Trigger: {SIGNAL_LABELS[status.triggered_by] || status.triggered_by}
            </span>
          </div>
        </div>
      )}

      {!invoking && status.recommendation === 'MAINTAIN' && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">{status.rationale}</p>
      )}
      {status.recommendation === 'NO_ACTION' && (
        <p className="text-xs text-[var(--accent-emerald)] leading-relaxed font-semibold">{status.rationale}</p>
      )}

      {/* Draft order section */}
      {order && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] overflow-hidden">
          <button
            onClick={() => setShowOrder(!showOrder)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-[var(--bg-surface)]"
          >
            <span className="flex items-center gap-2 text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
              <FileText className="h-4 w-4 text-[var(--accent-sky)]" />
              Statutory Draft Invocation Order · {order.order_id}
            </span>
            {showOrder ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
          </button>
          {showOrder && (
            <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-[var(--border-subtle)] pt-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[var(--text-secondary)] font-mono">
                <div>Authority: <span className="text-[var(--text-primary)] font-bold">{order.authority}</span></div>
                <div>Stage: <span className="text-[var(--text-primary)] font-bold">{order.stage_name}</span></div>
                <div>Effective From: <span className="text-[var(--text-primary)] font-bold">
                  {new Date(order.effective_from + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} IST
                </span></div>
                <div>Basis: <span className="text-[var(--text-primary)] font-bold">{SIGNAL_LABELS[order.basis.triggered_by] || order.basis.triggered_by}</span></div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {order.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-[var(--bg-surface)] rounded-md p-2 border border-[var(--border-subtle)]">
                    <span className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${STAGE_COLORS[a.stage].text} border ${STAGE_COLORS[a.stage].border}`}>
                      Stage {['I', 'II', 'III', 'IV'][a.stage - 1]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[var(--text-primary)] leading-snug font-medium">{a.action}</div>
                      <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">{a.agency}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">{order.citation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GRAPPanel;
