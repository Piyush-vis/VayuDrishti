import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Landmark, TimerReset } from 'lucide-react';
import { grapApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import ProvenanceBadge from '../common/ProvenanceBadge';
import LoadingSpinner from '../common/LoadingSpinner';

const STAGE_COLORS = {
  0: { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/40' },
  1: { text: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/40' },
  2: { text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/40' },
  3: { text: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/40' },
  4: { text: 'text-fuchsia-400', bg: 'bg-fuchsia-600', border: 'border-fuchsia-500/40' },
};

const SIGNAL_LABELS = {
  model_forecast: 'XGBoost forecast',
  trend_projection: 'Trend projection (24h OLS)',
  observed: 'Observed crossing',
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
      <div className="glass-card p-5 flex flex-col items-center justify-center h-32 gap-2">
        <LoadingSpinner size="small" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Evaluating GRAP triggers</span>
      </div>
    );
  }
  if (!status) return null;

  const invoking = status.recommendation === 'INVOKE_IN_ADVANCE';
  const activeStage = invoking ? status.projected_stage : status.current_stage;
  const col = STAGE_COLORS[activeStage] || STAGE_COLORS[0];
  const order = status.draft_order;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              GRAP — Forecast-Triggered Graded Response
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {status.is_ncr_statutory
              ? 'Statutory CAQM instrument · invocation drafted in advance of forecast crossings'
              : 'Advisory mode (GRAP is statutory in Delhi-NCR only) · same trigger engine'}
          </p>
        </div>
        <ProvenanceBadge source={status.provenance === 'replay' ? 'replay' : 'live'} />
      </div>

      {/* Stage ladder */}
      <div className="flex items-center gap-1.5">
        <div className="text-center mr-2">
          <div className={`text-2xl font-black ${col.text}`}>{status.city_index?.current ?? '–'}</div>
          <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">City index</div>
        </div>
        {[1, 2, 3, 4].map((s) => {
          const isCurrent = status.current_stage === s;
          const isProjected = invoking && status.projected_stage === s;
          const c = STAGE_COLORS[s];
          return (
            <div
              key={s}
              className={`flex-1 rounded-lg border px-2 py-2 text-center transition-all ${
                isCurrent ? `${c.border} bg-slate-900/80 ring-1 ring-inset ring-current ${c.text}`
                : isProjected ? `${c.border} bg-slate-900/60 ${c.text} animate-pulse`
                : 'border-slate-800 bg-slate-900/40 text-slate-600'
              }`}
              title={`${s === 1 ? 'AQI 201-300' : s === 2 ? 'AQI 301-400' : s === 3 ? 'AQI 401-450' : 'AQI >450'}`}
            >
              <div className="text-[11px] font-black">{['I', 'II', 'III', 'IV'][s - 1]}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider">
                {['Poor', 'V. Poor', 'Severe', 'Severe+'][s - 1]}
              </div>
              {isCurrent && <div className="text-[8px] font-bold mt-0.5">ACTIVE</div>}
              {isProjected && <div className="text-[8px] font-bold mt-0.5">PROJECTED</div>}
            </div>
          );
        })}
      </div>

      {/* Advance-invocation alert — the headline moment */}
      {invoking && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              Forecast crosses {order?.basis?.threshold} in ~{status.crossing_eta_hours}h — invocation order drafted
            </span>
          </div>
          <p className="text-[10px] text-red-200/80 leading-relaxed">{status.rationale}</p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
              <TimerReset className="h-3 w-3" />
              Lead time gained: {status.lead_time_hours}h before crossing
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800/80 text-slate-300">
              Trigger: {SIGNAL_LABELS[status.triggered_by] || status.triggered_by}
            </span>
          </div>
          <p className="text-[9px] text-slate-500">
            Winter 2025-26 reality: 13 of 17 GRAP invocations came only AFTER thresholds were crossed (ThePrint/CEEW).
          </p>
        </div>
      )}

      {!invoking && status.recommendation === 'MAINTAIN' && (
        <p className="text-[10px] text-slate-400 leading-relaxed">{status.rationale}</p>
      )}
      {status.recommendation === 'NO_ACTION' && (
        <p className="text-[10px] text-emerald-400/90 leading-relaxed">{status.rationale}</p>
      )}

      {/* Draft order */}
      {order && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setShowOrder(!showOrder)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
          >
            <span className="flex items-center gap-2 text-[10px] font-bold text-slate-200 uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-blue-300" />
              Draft invocation order · {order.order_id}
            </span>
            {showOrder ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </button>
          {showOrder && (
            <div className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400">
                <div>Authority: <span className="text-slate-200 font-semibold">{order.authority}</span></div>
                <div>Stage: <span className="text-slate-200 font-semibold">{order.stage_name}</span></div>
                <div>Effective from: <span className="text-slate-200 font-semibold">
                  {new Date(order.effective_from + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} IST
                </span></div>
                <div>Basis: <span className="text-slate-200 font-semibold">{SIGNAL_LABELS[order.basis.triggered_by] || order.basis.triggered_by}</span></div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {order.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] bg-slate-950/50 rounded px-2 py-1.5 border border-slate-800/60">
                    <span className={`shrink-0 mt-0.5 text-[8px] font-black px-1 rounded ${STAGE_COLORS[a.stage].text} border ${STAGE_COLORS[a.stage].border}`}>
                      {['I', 'II', 'III', 'IV'][a.stage - 1]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-slate-200 leading-snug">{a.action}</div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{a.agency}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-slate-500">{order.citation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GRAPPanel;
