import React from 'react';
import { Box } from '@mui/material';
import EnforcementPanel from '../components/panels/EnforcementPanel';
import GRAPPanel from '../components/panels/GRAPPanel';

function Enforcement({ activeCity, fetchBaseData }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      <GRAPPanel city={activeCity} />
      <EnforcementPanel city={activeCity} onRefresh={fetchBaseData} />
    </Box>
  );
}

export default Enforcement;
