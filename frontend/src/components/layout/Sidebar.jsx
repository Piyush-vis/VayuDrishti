import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ShieldAlert, 
  BellRing, 
  BarChart3 
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Command Center', icon: LayoutDashboard },
    { path: '/predictions', label: '72H Predictions', icon: TrendingUp },
    { path: '/enforcement', label: 'Enforcement Desk', icon: ShieldAlert },
    { path: '/advisory', label: 'Citizen Portal', icon: BellRing },
    { path: '/compare', label: 'City Analytics', icon: BarChart3 }
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="py-6 px-4 space-y-6">
        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navigation</p>
        </div>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                {({ isActive }) => (
                    <>
                        <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        <span>{item.label}</span>
                    </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-center">
        <p className="text-[10px] text-slate-500 font-medium">ET AI HACKATHON 2.0</p>
        <p className="text-[9px] text-slate-600 font-mono mt-0.5">Prototype Submission</p>
      </div>
    </aside>
  );
};

export default Sidebar;
