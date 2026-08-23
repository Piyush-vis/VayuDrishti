import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Paper,
  Avatar,
  CircularProgress,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { chatApi } from '../../services/api';

const SUGGESTED_QUERIES = [
  'What is the 24-hr NAAQS standard for PM2.5?',
  'What are the GRAP Stage III emergency rules?',
  'What is the NCAP clean air target for Indian cities?',
];

const ChatPanel = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am VayuDrishti's AI Regulatory Assistant. Ask me about CPCB regulations, NAAQS standards, GRAP emergency stages, or NCAP targets.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: queryText, sources: [] }]);
    setLoading(true);

    try {
      const resp = await chatApi.query(queryText);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: resp.answer,
          sources: resp.sources || [],
          provenance: resp.provenance,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'I encountered an error connecting to the regulatory intelligence index. Please try again in a moment.',
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 520, bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, borderRadius: 1 }}>
            <MenuBookIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              CPCB Regulatory Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
              NAAQS, NCAP & GRAP Frameworks
            </Typography>
          </Box>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Suggested Quick Questions */}
      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main', shrink: 0 }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          SUGGESTED:
        </Typography>
        {SUGGESTED_QUERIES.map((q, idx) => (
          <Chip
            key={idx}
            label={q}
            size="small"
            variant="outlined"
            onClick={() => sendQuery(q)}
            clickable
            sx={{ borderRadius: 1, fontSize: '0.6875rem', height: 24, whiteSpace: 'nowrap' }}
          />
        ))}
      </Box>

      {/* Messages area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              gap: 1.5,
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.sender === 'bot' && (
              <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, borderRadius: 1 }}>
                <SmartToyIcon sx={{ fontSize: 16 }} />
              </Avatar>
            )}

            <Box sx={{ maxWidth: '85%' }}>
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {msg.text}
                </Typography>
              </Paper>

              {/* Citations / Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.5, px: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem', fontWeight: 700 }}>
                    SOURCES:
                  </Typography>
                  {msg.sources.map((s, sIdx) => (
                    <Chip
                      key={sIdx}
                      label={s}
                      size="small"
                      sx={{ height: 18, fontSize: '0.625rem', borderRadius: 1, fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {msg.sender === 'user' && (
              <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28, borderRadius: 1 }}>
                <PersonIcon sx={{ fontSize: 16 }} />
              </Avatar>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, borderRadius: 1 }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Paper elevation={1} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} color="primary" />
              <Typography variant="caption" color="text.secondary">
                Analyzing CPCB documents...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Form */}
      <Box
        component="form"
        onSubmit={handleSend}
        sx={{ p: 1.5, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about NAAQS limits, NCAP targets, or GRAP..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          variant="outlined"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.8125rem' } }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!input.trim() || loading}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatPanel;
