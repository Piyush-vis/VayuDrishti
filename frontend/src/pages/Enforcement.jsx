import { motion } from 'framer-motion';
import React from 'react';
import EnforcementPanel from '../components/panels/EnforcementPanel';
import GRAPPanel from '../components/panels/GRAPPanel';

function Enforcement({ activeCity, fetchBaseData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 w-full"
    >
      <GRAPPanel city={activeCity} />
      <div className="glass-card p-6 bg-slate-900/20 w-full">
        <EnforcementPanel city={activeCity} onRefresh={fetchBaseData} />
      </div>
    </motion.div>
  );
}

export default Enforcement;
