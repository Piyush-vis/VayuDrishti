import React, { useEffect, useState } from 'react';
import { enforcementApi } from '../../services/api';
import { ShieldCheck, Clock, AlertTriangle, PlayCircle, Sparkles, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';

const EnforcementPanel = ({ city, onRefresh }) => {
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
  }, [city]);

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
      1: { text: 'Critical', bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
      2: { text: 'High', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      3: { text: 'Medium', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      4: { text: 'Low', bg: 'bg-green-500/20 text-green-400 border-green-500/30' }
    };
    const c = configs[priority] || configs[3];
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${c.bg}`}>
        {c.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { text: 'Pending', bg: 'bg-slate-800 text-slate-400 border-slate-700' },
      assigned: { text: 'Dispatched', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' },
      resolved: { text: 'Resolved', bg: 'bg-green-500/10 text-green-400 border-green-500/20' }
    };
    const c = configs[status] || configs.pending;
    return (
      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${c.bg}`}>
        {c.text}
      </span>
    );
  };

  if (loading && actions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-xs text-slate-500">
        <LoadingSpinner size="medium" />
        <span>Scanning for violations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Enforcement Desk</h3>
        <p className="text-[10px] text-slate-400">Prioritized inspection logs and mitigation directives</p>
      </div>

      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {actions.length === 0 ? (
          <div className="text-center py-8 glass-card border-dashed p-4 text-slate-500 text-xs">
            ✓ No active particulate or gaseous compliance breaches detected in this city.
          </div>
        ) : (
          actions.map((action) => (
            <div key={action._id} className="glass-card p-4 space-y-3 glass-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(action.priority)}
                  {getStatusBadge(action.status)}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">
                  {formatDateTime(action.generated_at)}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white leading-snug">{action.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{action.description}</p>
              </div>

              {/* Evidence trail accordion summary */}
              <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 text-[10px] space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Target Pollutant:</span>
                  <span className="font-bold text-slate-200">{action.evidence.pollutant}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reading:</span>
                  <span className="font-bold text-red-400">{action.evidence.current_level} µg/m³ (Limit: {action.evidence.threshold})</span>
                </div>
                <div className="flex justify-between">
                  <span>Exceedance duration:</span>
                  <span className="font-medium text-slate-200">{action.evidence.duration_hours} hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Likely Sources:</span>
                  <span className="text-slate-200 truncate max-w-[140px]" title={action.evidence.nearby_sources.join(', ')}>
                    {action.evidence.nearby_sources.join(', ')}
                  </span>
                </div>
              </div>

              {/* AI Compound Risk Analysis */}
              {action.ai_analysis ? (
                <div className={`p-2.5 rounded-lg border text-[10px] space-y-1.5 ${
                  action.ai_analysis.compound_risk
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-slate-900/50 border-slate-800/80'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 text-blue-400" />
                    <span className={action.ai_analysis.compound_risk ? 'text-red-400' : 'text-slate-300'}>
                      AI Compound Risk: {action.ai_analysis.compound_risk ? 'Confirmed' : 'Not Confirmed'}
                    </span>
                    <span className="text-slate-500 font-normal normal-case">
                      ({Math.round((action.ai_analysis.confidence || 0) * 100)}% confidence)
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{action.ai_analysis.rationale}</p>
                  {action.ai_analysis.regulatory_basis && (
                    <p className="text-slate-500 italic">Basis: {action.ai_analysis.regulatory_basis}</p>
                  )}
                  {action.ai_analysis.recommended_escalation && (
                    <p className="text-blue-300 font-medium">→ {action.ai_analysis.recommended_escalation}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleAnalyze(action._id)}
                    disabled={analyzingId === action._id}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {analyzingId === action._id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Run AI Compound-Risk Analysis</span>
                      </>
                    )}
                  </button>
                  {analysisError[action._id] && (
                    <span className="text-[9px] text-red-400 max-w-[160px] truncate" title={analysisError[action._id]}>
                      {analysisError[action._id]}
                    </span>
                  )}
                </div>
              )}

              {/* Dispatch controls */}
              {action.status !== 'resolved' && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleUpdateStatus(action._id, action.status)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all active:scale-95 ${
                      action.status === 'pending'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/10'
                        : 'bg-green-600 hover:bg-green-500 text-white shadow shadow-green-500/10'
                    }`}
                  >
                    {action.status === 'pending' ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Dispatch Patrols</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Mark Resolved</span>
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
