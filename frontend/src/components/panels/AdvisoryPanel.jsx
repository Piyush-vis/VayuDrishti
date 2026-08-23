import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Paper,
  CircularProgress
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import SyncIcon from '@mui/icons-material/Sync';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

import { advisoryApi } from '../../services/api';
import { useReplay } from '../../context/ReplayContext';
import { useSpeech } from '../../hooks/useSpeech';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali (বাংলা)', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
];

const ADVISORY_GROUPS = [
  { key: 'general', title: 'General Public Advisory', icon: HealthAndSafetyIcon, color: 'primary' },
  { key: 'vulnerable', title: 'Sensitive / Vulnerable Groups', icon: WarningAmberIcon, color: 'error' },
  { key: 'workers', title: 'Outdoor Workers & Commuters', icon: FitnessCenterIcon, color: 'warning' },
];

const AdvisoryPanel = ({ city, zone, aqiLevel, category, onAdvisories }) => {
  const { replayAtDebounced } = useReplay();
  const { supported, speak, stop, speakingKey } = useSpeech();
  const [selectedLang, setSelectedLang] = useState('en');
  const [advisories, setAdvisories] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvisory = async () => {
    setLoading(true);
    try {
      const data = await advisoryApi.citizen(city, zone);
      setAdvisories(data.advisories);
      if (onAdvisories) onAdvisories(data.advisories);
    } catch (e) {
      console.error('Failed to fetch advisories: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchAdvisory();
    }
  }, [city, zone, aqiLevel, replayAtDebounced]);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await advisoryApi.generate(city, zone);
      setAdvisories(res.data.advisories);
      if (onAdvisories) onAdvisories(res.data.advisories);
    } catch (e) {
      console.error(e);
      alert('AI Advisory Regeneration: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getAdvisoryText = (group) => {
    if (!advisories) return 'Loading health guidance...';
    const groupData = advisories[group];
    if (!groupData) return 'No data for this group.';
    return groupData[selectedLang] || groupData['en'] || 'No translation available.';
  };

  const ListenButton = ({ group }) => {
    if (!supported) return null;
    const key = `${group}-${selectedLang}`;
    const isSpeaking = speakingKey === key;
    return (
      <Button
        size="small"
        variant={isSpeaking ? 'contained' : 'outlined'}
        color={isSpeaking ? 'error' : 'primary'}
        startIcon={isSpeaking ? <StopIcon /> : <VolumeUpIcon />}
        onClick={() => (isSpeaking ? stop() : speak(getAdvisoryText(group), selectedLang, key))}
        sx={{ borderRadius: 1, height: 28, fontSize: '0.75rem' }}
      >
        {isSpeaking ? 'Stop' : 'Listen / सुनें'}
      </Button>
    );
  };

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header with Regenerate Action */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsActiveIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Citizen Health Advisories
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Multi-lingual guidance for {zone || city}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={loading ? <CircularProgress size={14} /> : <SyncIcon />}
            onClick={handleRegenerate}
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </Box>

        {/* Language Tabs */}
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2.5, pb: 0.5 }}>
          {LANGUAGES.map((lang) => (
            <Chip
              key={lang.code}
              label={`${lang.flag} ${lang.label}`}
              size="small"
              clickable
              color={selectedLang === lang.code ? 'primary' : 'default'}
              variant={selectedLang === lang.code ? 'filled' : 'outlined'}
              onClick={() => setSelectedLang(lang.code)}
              sx={{ borderRadius: 1, fontWeight: 600 }}
            />
          ))}
        </Box>

        {/* Advisory Cards */}
        {loading && !advisories ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} color="primary" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Generating health advisories...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ADVISORY_GROUPS.map(({ key, title, icon: Icon, color }) => (
              <Paper key={key} variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon fontSize="small" color={color} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {title}
                    </Typography>
                  </Box>
                  <ListenButton group={key} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.8125rem' }}>
                  {getAdvisoryText(key)}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvisoryPanel;
