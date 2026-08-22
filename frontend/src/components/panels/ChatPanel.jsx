import React, { useState, useRef, useEffect } from 'react';
import { chatApi } from '../../services/api';
import { Send, Bot, User, BookOpen, Sparkles, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const SUGGESTED_QUERIES = [
  "What is the 24-hr NAAQS standard for PM2.5?",
  "What are the GRAP Stage III emergency rules?",
  "What is the NCAP clean air target for Indian cities?"
];

const ChatPanel = ({ onClose }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am VayuDrishti's AI Regulatory Assistant. Ask me about CPCB regulations, NAAQS standards, GRAP emergency stages, or NCAP targets.",
      sources: []
    }
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
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev, 
        { 
          sender: 'bot', 
          text: "I encountered an error connecting to the regulatory intelligence index. Please try again in a moment.", 
          sources: [] 
        }
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
    <div className="flex flex-col h-[520px] bento-card overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-[var(--bg-surface-elevated)] px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] rounded-lg border border-[var(--accent-emerald-border)]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider">
              CPCB Regulatory Assistant
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">
              Grounded in NAAQS, NCAP & GRAP Frameworks
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
            title="Close Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto shrink-0">
        <Sparkles className="h-3 w-3 text-[var(--accent-emerald)] shrink-0" />
        <span className="text-[10px] font-heading font-semibold text-[var(--text-muted)] uppercase shrink-0">Suggested:</span>
        {SUGGESTED_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => sendQuery(q)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] whitespace-nowrap transition-all cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--bg-base)]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && (
              <div className="h-7 w-7 rounded-lg bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border border-[var(--accent-emerald-border)] flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
            )}
            
            <div className="space-y-1.5 max-w-[85%]">
              <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[var(--accent-emerald)] text-white font-medium rounded-tr-none shadow-sm'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-none shadow-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Citations / Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Sources:</span>
                  {msg.sources.map((s, sIdx) => (
                    <span key={sIdx} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="h-7 w-7 rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="h-7 w-7 rounded-lg bg-[var(--accent-emerald-subtle)] text-[var(--accent-emerald)] border border-[var(--accent-emerald-border)] flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl rounded-tl-none text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--accent-emerald)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--accent-emerald)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--accent-emerald)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="bg-[var(--bg-surface-elevated)] p-3 border-t border-[var(--border-subtle)] flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about NAAQS limits, NCAP targets, or GRAP stages..."
          className="flex-1 input-base text-xs py-2 px-3 font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn-primary text-xs px-3.5 py-2 shrink-0 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
