import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TimelineIcon from '@mui/icons-material/Timeline';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useReplay } from '../../context/ReplayContext';

const DRAWER_WIDTH = 240;

const Sidebar = ({ open = true }) => {
  const location = useLocation();
  const { episodes, episode, enterReplay, exitReplay } = useReplay();

  const menuItems = [
    { path: '/', label: 'Command Center', icon: DashboardIcon },
    { path: '/war-room', label: 'Incident War Room', icon: TrackChangesIcon },
    { path: '/predictions', label: '72H Predictions', icon: TimelineIcon },
    { path: '/enforcement', label: 'Enforcement Desk', icon: GavelIcon },
    { path: '/advisory', label: 'Citizen Portal', icon: NotificationsActiveIcon },
    { path: '/compare', label: 'City Analytics', icon: CompareArrowsIcon },
  ];

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <Box sx={{ py: 1 }}>
          {/* Navigation Section */}
          <List
            dense
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: 'transparent', typography: 'overline', color: 'text.secondary', fontWeight: 700 }}>
                NAVIGATION
              </ListSubheader>
            }
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 1, my: 0.25 }}>
                  <ListItemButton
                    component={NavLink}
                    to={item.path}
                    selected={isActive}
                    sx={{
                      borderRadius: 1,
                      py: 1,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(0, 180, 216, 0.12)',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'rgba(0, 180, 216, 0.18)',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'primary.main' : 'text.secondary' }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 1.5 }} />

          {/* Operating Mode / Crisis Replay */}
          <List
            dense
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: 'transparent', typography: 'overline', color: 'text.secondary', fontWeight: 700 }}>
                OPERATING MODE
              </ListSubheader>
            }
          >
            {/* Real-time Stream */}
            <ListItem disablePadding sx={{ px: 1, my: 0.25 }}>
              <ListItemButton
                onClick={exitReplay}
                selected={!episode}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(129, 199, 132, 0.12)',
                    color: 'success.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: !episode ? 'success.main' : 'text.secondary' }}>
                  <RadioButtonCheckedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Real-time Stream"
                  secondary="Live sensor feeds"
                  primaryTypographyProps={{ variant: 'body2', fontWeight: !episode ? 600 : 500 }}
                  secondaryTypographyProps={{ variant: 'caption', fontSize: '0.7rem' }}
                />
              </ListItemButton>
            </ListItem>

            {/* Crisis Episodes */}
            {episodes.map((ep) => (
              <ListItem key={ep.episode_id} disablePadding sx={{ px: 1, my: 0.25 }}>
                <ListItemButton
                  onClick={() => enterReplay(ep)}
                  selected={episode?.episode_id === ep.episode_id}
                  sx={{
                    borderRadius: 1,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(255, 183, 77, 0.12)',
                      color: 'warning.main',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: episode?.episode_id === ep.episode_id ? 'warning.main' : 'text.secondary' }}>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={ep.label}
                    secondary="Crisis Episode"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: episode?.episode_id === ep.episode_id ? 600 : 500 }}
                    secondaryTypographyProps={{ variant: 'caption', fontSize: '0.7rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Bottom System Info: Only App Name */}
        <Box sx={{ p: 2, pb: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '0.04em' }}>
            VayuDrishti
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
