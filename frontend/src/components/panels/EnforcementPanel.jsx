import React, { useEffect, useState } from 'react';
import { enforcementApi } from '../../services/api';
import { ShieldCheck, PlayCircle, Sparkles, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';
import { useReplay } from '../../context/ReplayContext';

const EnforcementPanel = ({ city, onRefresh }) => {
  const { replayAtDebounced } = useReplay();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisError, setAnalysisError] = useState({});

  const fetchActions = async () => {
    setLoading(true);
    try {
      const data = await enforcementApi.actions(city);
      setActions(data);
    } catch (e) {
      console.error("Failed to fetch enforcement actions: ", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchActions();
    }
  }, [city, replayAtDebounced]);

  const handleUpdateStatus = async (id, currentStatus) => {
    let nextStatus = 'assigned';
    if (currentStatus === 'assigned') nextStatus = 'resolved';
    
    try {
      await enforcementApi.update(id, nextStatus);
      fetchActions();
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("Failed to update status: " + e.message);
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzingId(id);
    setAnalysisError((prev) => ({ ...prev, [id]: null }));
    try {
      const updated = await enforcementApi.analyze(id);
      setActions((prev) => prev.map((a) => (a._id === id ? updated : a)));
    } catch (e) {
      setAnalysisError((prev) => ({ ...prev, [id]: e.response?.data?.detail || 'AI analysis unavailable.' }));
    } finally {
      setAnalyzingId(null);
    }
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      1: { text: 'Critical', cls: 'bg-[var(--accent-crimson-subtle)] text-[var(--accent-crimson)] border-[var(--accent-crimson-border)]' },
      2: { text: 'High', cls: 'bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] border-[var(--accent-amber-border)]' },
      3: { text: 'Medium', cls: 'bg-[var(--accent-sky-subtle)] text-[var(--accent-sky)] border-[var(--accent-sky-border)]' },
      4: { text: 'Low', cls: 'bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border-[var(--accent-emerald-border)]' }
    };
    const c = configs[priority] || configs[3];
    return (
      <span className={`text-[11px] font-heading font-bold px-2 py-0.5 rounded border ${c.cls}`}>
        {c.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { text: 'Pending Action', cls: 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]' },
      assigned: { text: 'Patrol Dispatched', cls: 'bg-[var(--accent-sky-subtle)] text-[var(--accent-sky)] border-[var(--accent-sky-border)] pulse-dot' },
      resolved: { text: 'Resolved', cls: 'bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border-[var(--accent-emerald-border)]' }
    };
    const c = configs[status] || configs.pending;
    return (
      <span className={`text-[10px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${c.cls}`}>
        {c.text}
      </span>
    );
  };

  if (loading && actions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-xs text-[var(--text-muted)]">
        <LoadingSpinner size="medium" />
        <span>Scanning telemetry for particulate & gaseous exceedances...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Enforcement & Inspection Desk
        </h3>
        <p className="text-xs text-[var(--text-secondary)] font-normal">
          Automated CPCB compliance anomaly detection and field patrol directives
        </p>
      </div>

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {actions.length === 0 ? (
          <div className="text-center py-10 bento-card border-dashed p-6 text-xs text-[var(--text-secondary)]">
            <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] flex items-center justify-center">
              ✓
            </div>
            <p className="font-heading font-bold text-sm text-[var(--text-primary)]">All Monitors Within Normal Operating Bounds</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">No active NAAQS particulate or gaseous breaches detected in this region.</p>
          </div>
        ) : (
          actions.map((action) => (
            <div key={action._id} className="bento-card p-4 space-y-3 bento-card-interactive">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(action.priority)}
                  {getStatusBadge(action.status)}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {formatDateTime(action.generated_at)}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-heading font-bold text-[var(--text-primary)] leading-snug">{action.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{action.description}</p>
              </div>

              {/* Evidence trail */}
              <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Target Pollutant:</span>
                  <span className="font-bold text-[var(--text-primary)]">{action.evidence.pollutant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Recorded Level:</span>
                  <span className="font-bold text-[var(--accent-crimson)]">{action.evidence.current_level} µg/m³ (NAAQS: {action.evidence.threshold})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Exceedance Duration:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{action.evidence.duration_hours} consecutive hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Nearby Attribution:</span>
                  <span className="text-[var(--text-primary)] truncate max-w-[200px]" title={action.evidence.nearby_sources.join(', ')}>
                    {action.evidence.nearby_sources.join(', ')}
                  </span>
                </div>
              </div>

              {/* AI Compound Risk Analysis */}
              {action.ai_analysis ? (
                <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  action.ai_analysis.compound_risk
                    ? 'bg-[var(--accent-crimson-subtle)] border-[var(--accent-crimson-border)]'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
                }`}>
                  <div className="flex items-center gap-2 font-heading font-bold uppercase text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
                    <span className={action.ai_analysis.compound_risk ? 'text-[var(--accent-crimson)]' : 'text-[var(--text-primary)]'}>
                      AI Compound Risk: {action.ai_analysis.compound_risk ? 'Confirmed Severe Breach' : 'Isolated Anomaly'}
                    </span>
                    <span className="text-[var(--text-muted)] font-mono text-[10px] normal-case">
                      ({Math.round((action.ai_analysis.confidence || 0) * 100)}% confidence)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">{action.ai_analysis.rationale}</p>
                  {action.ai_analysis.regulatory_basis && (
                    <p className="text-[11px] text-[var(--text-secondary)] italic">Statutory Basis: {action.ai_analysis.regulatory_basis}</p>
                  )}
                  {action.ai_analysis.recommended_escalation && (
                    <p className="text-xs text-[var(--accent-sky)] font-heading font-semibold">→ {action.ai_analysis.recommended_escalation}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleAnalyze(action._id)}
                    disabled={analyzingId === action._id}
                    className="btn-secondary text-xs py-1 px-2.5"
                  >
                    {analyzingId === action._id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Running Multi-Agent Check...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-[var(--accent-sky)]" />
                        <span>Inspect Compound Risk (AI)</span>
                      </>
                    )}
                  </button>
                  {analysisError[action._id] && (
                    <span className="text-xs text-[var(--accent-crimson)] max-w-[180px] truncate" title={analysisError[action._id]}>
                      {analysisError[action._id]}
                    </span>
                  )}
                </div>
              )}

              {/* Action dispatch buttons */}
              {action.status !== 'resolved' && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleUpdateStatus(action._id, action.status)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    {action.status === 'pending' ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Dispatch Field Patrols</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Mark Action Resolved</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnforcementPanel;
