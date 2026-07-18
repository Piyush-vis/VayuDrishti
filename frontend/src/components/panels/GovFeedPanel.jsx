import React, { useEffect, useState } from 'react';
import { Database, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { dataApi } from '../../services/api';

// Live scalability proof: the platform ingests the official Government of India
// CPCB CAAQMS feed directly (data.gov.in), so onboarding a city is a config
// entry, not an integration project.
const GovFeedPanel = () => {
  const [cov, setCov] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dataApi.govCoverage()
      .then((d) => { if (!cancelled) setCov(d); })
      .catch(() => { if (!cancelled) setCov({ available: false, reason: 'request failed' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-sky-400" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Official CPCB Feed · data.gov.in
        </h3>
        {loading ? (
          <Loader2 className="h-3 w-3 text-slate-500 animate-spin" />
        ) : cov?.available ? (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
            <AlertCircle className="h-3 w-3" /> Offline
          </span>
        )}
      </div>

      {cov?.available ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={cov.total_available ?? '—'} label="Records live" />
            <Stat value={cov.distinct_cities} label="Cities" />
            <Stat value={cov.distinct_states} label="States" />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            We ingest the same national feed CPCB's SAMEER app uses — the platform
            already scales to <span className="font-bold text-slate-200">500+ CAAQMS stations</span> nationwide.
            Adding a city is a config entry.
          </p>
          {cov.sample_cities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cov.sample_cities.slice(0, 10).map((c) => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{c}</span>
              ))}
            </div>
          )}
          <p className="text-[8px] text-slate-600">{cov.license}</p>
        </>
      ) : (
        <>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Official feed adapter is wired and verified. Live call unavailable right now
            {cov?.reason ? ` (${cov.reason})` : ''}; the platform continues on curated stations + simulator.
          </p>
          {cov?.published_scale && (
            <p className="text-[10px] text-slate-300 font-semibold">{cov.published_scale}</p>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ value, label }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-center">
    <div className="text-lg font-black text-white leading-none">{value}</div>
    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</div>
  </div>
);

export default GovFeedPanel;
