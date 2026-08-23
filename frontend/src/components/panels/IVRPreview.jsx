import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useSpeech } from '../../hooks/useSpeech';

const IVR_LANGS = [
  { code: 'hi', key: '2', label: 'हिंदी' },
  { code: 'en', key: '1', label: 'English' },
  { code: 'ta', key: '3', label: 'தமிழ்' },
  { code: 'bn', key: '4', label: 'বাংলা' },
];

const IVRPreview = ({ advisories, category, zone }) => {
  const { supported, speak, stop, speakingKey } = useSpeech();
  const [lang, setLang] = useState('hi');

  const line = advisories?.general?.[lang] || advisories?.general?.en || '';
  const greeting = {
    hi: 'नमस्ते। वायुदृष्टि वायु गुणवत्ता चेतावनी।',
    en: 'Hello. This is a VayuDrishti air quality alert.',
    ta: 'வணக்கம். இது வாயுதிருஷ்டி காற்று தர எச்சரிக்கை.',
    bn: 'নমস্কার। এটি একটি বায়ুদৃষ্টি বায়ু মানের সতর্কতা।',
  }[lang] || '';
  const fullMessage = `${greeting} ${line}`;

  return (
    <Card elevation={1} sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              IVR Voice & WhatsApp
            </Typography>
          </Box>
          <Chip label="Live Synthesizer" size="small" variant="outlined" sx={{ borderRadius: 1, height: 20, fontSize: '0.6875rem' }} />
        </Box>

        {/* Phone Frame */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1, bgcolor: 'background.default' }}>
          <Box sx={{ textAlign: 'center', pb: 1, mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
              Incoming Alert · 1800-VAYU
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              CPCB Air Emergency Desk
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            "Press key for regional language / भाषा चुनें"
          </Typography>

          <Grid container spacing={1} sx={{ mb: 2 }}>
            {IVR_LANGS.map((l) => (
              <Grid item xs={6} key={l.code}>
                <Button
                  fullWidth
                  size="small"
                  variant={lang === l.code ? 'contained' : 'outlined'}
                  color={lang === l.code ? 'primary' : 'inherit'}
                  onClick={() => setLang(l.code)}
                  sx={{ borderRadius: 1, py: 0.5, fontSize: '0.75rem' }}
                >
                  <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, mr: 0.5 }}>
                    [{l.key}]
                  </Box>
                  {l.label}
                </Button>
              </Grid>
            ))}
          </Grid>

          {/* WhatsApp message bubble */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'rgba(0, 180, 216, 0.08)',
              border: 1,
              borderColor: 'rgba(0, 180, 216, 0.25)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: 'primary.main' }}>
              <WhatsAppIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {zone || 'NCR'} · {category || 'Advisory'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
              {line || 'Processing advisory alert...'}
            </Typography>
          </Paper>
        </Paper>

        {/* TTS Speech Trigger Button */}
        <Button
          fullWidth
          variant="contained"
          color={speakingKey === 'ivr' ? 'error' : 'primary'}
          startIcon={speakingKey === 'ivr' ? <StopIcon /> : <VolumeUpIcon />}
          onClick={() => (speakingKey === 'ivr' ? stop() : speak(fullMessage, lang, 'ivr'))}
          disabled={!supported}
          sx={{ borderRadius: 1 }}
        >
          {speakingKey === 'ivr' ? 'Stop Voice Broadcast' : 'Play Voice Broadcast'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IVRPreview;
