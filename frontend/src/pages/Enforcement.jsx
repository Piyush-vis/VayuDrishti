import { motion } from 'framer-motion';
import React from 'react';
import EnforcementPanel from '../components/panels/EnforcementPanel';
import GRAPPanel from '../components/panels/GRAPPanel';

function Enforcement({ activeCity, fetchBaseData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5 w-full max-w-7xl mx-auto"
    >
      <GRAPPanel city={activeCity} />
      <div className="bento-card p-5 w-full">
        <EnforcementPanel city={activeCity} onRefresh={fetchBaseData} />
      </div>
    </motion.div>
  );
}

export default Enforcement;
