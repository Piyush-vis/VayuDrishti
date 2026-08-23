import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Select, 
  MenuItem, 
  Button, 
  IconButton, 
  Chip, 
  CircularProgress,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SyncIcon from '@mui/icons-material/Sync';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SensorsIcon from '@mui/icons-material/Sensors';
import { CITIES } from '../../utils/constants';
import { dataApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ activeCity, onCityChange, dataFreshness, onRefresh, onToggleSidebar, sidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const [ingesting, setIngesting] = useState(false);

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    try {
      await dataApi.ingest();
      setTimeout(() => {
        onRefresh();
        setIngesting(false);
      }, 2500);
    } catch (e) {
      console.error(e);
      setIngesting(false);
      alert('Ingestion trigger: ' + e.message);
    }
  };

  return (
    <AppBar position="static" elevation={2} color="default" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        {/* Left: Sidebar Toggle, Platform Title & Telemetry Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={sidebarOpen ? "Collapse Navigation (Menu)" : "Expand Navigation (Menu)"}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={onToggleSidebar}
              sx={{ mr: 0.5, borderRadius: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: '0.02em', color: 'primary.main' }}>
            VAYUDRISHTI
          </Typography>
          <Chip 
            label="वायुदृष्टि" 
            size="small" 
            variant="outlined" 
            color="primary" 
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 22, fontSize: '0.75rem' }} 
          />
          <Chip 
            icon={<SensorsIcon sx={{ fontSize: '1rem !important' }} />}
            label="CPCB LIVE" 
            size="small" 
            color="success" 
            sx={{ display: { xs: 'none', md: 'inline-flex' }, height: 22, fontSize: '0.75rem' }} 
          />
        </Box>

        {/* Right: Controls (City Select, Ingest Button, Theme Toggle, Freshness) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* City Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'inline-block' }, fontWeight: 600 }}>
              CITY:
            </Typography>
            <Select
              size="small"
              value={activeCity}
              onChange={(e) => onCityChange(e.target.value)}
              sx={{ minWidth: 140, height: 34, fontSize: '0.8125rem' }}
            >
              {Object.entries(CITIES).map(([key, city]) => (
                <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                  {city.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Ingest Feed Button */}
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleTriggerIngestion}
            disabled={ingesting}
            startIcon={ingesting ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            sx={{ height: 34, px: 2 }}
          >
            {ingesting ? 'Syncing...' : 'Ingest Feed'}
          </Button>

          {/* Theme Switcher Toggle */}
          <Tooltip title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
            <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {theme === 'dark' ? <Brightness7Icon fontSize="small" sx={{ color: 'warning.main' }} /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Data Freshness Indicator */}
          {dataFreshness && (
            <Chip
              label={dataFreshness}
              size="small"
              variant="outlined"
              sx={{ display: { xs: 'none', lg: 'inline-flex' }, fontFamily: 'monospace', fontSize: '0.6875rem', height: 22 }}
            />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
