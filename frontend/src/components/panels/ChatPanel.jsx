import React, { useState, useRef, useEffect } from 'react';
import { chatApi } from '../../services/api';
import { Send, Bot, User, BookOpen } from 'lucide-react';

const ChatPanel = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am VayuDrishti's regulatory assistant. I can answer questions about CPCB rules, National Ambient Air Quality Standards (NAAQS), or National Clean Air Programme (NCAP) targets.\n\nTry asking: 'What is the NAQI threshold for PM2.5?' or 'What are the goals of NCAP?'",
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQuestion, sources: [] }]);
    setLoading(true);

    try {
      const resp = await chatApi.query(userQuestion);
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
          text: "Sorry, I encountered an error connecting to the compliance RAG index. Please check your backend connection.", 
          sources: [] 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] glass-card overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">CPCB Policy RAG Bot</h3>
            <p className="text-[9px] text-slate-500 font-medium">Verify air quality standards and compliance protocols</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-all text-xs font-bold px-2 py-1 rounded hover:bg-slate-800/60"
            title="Close Assistant"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && (
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg h-7 w-7 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Bot className="h-4 w-4" />
              </div>
            )}
            
            <div className="space-y-1.5 max-w-[80%]">
              <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Citations / Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider mr-1 mt-0.5">Sources:</span>
                  {msg.provenance && (msg.provenance === 'cached' || msg.provenance === 'live' || msg.provenance === 'retrieval-only') && (
                    <span className={`text-[8px] font-bold px-1 rounded border ${
                      msg.provenance === 'live' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                      : msg.provenance === 'cached' ? 'text-sky-400 border-sky-500/40 bg-sky-500/10'
                      : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                    }`}>
                      {msg.provenance === 'retrieval-only' ? 'RETRIEVAL' : msg.provenance.toUpperCase()}
                    </span>
                  )}
                  {msg.sources.map((s, sIdx) => (
                    <span key={sIdx} className="text-[8px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-1 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg h-7 w-7 flex items-center justify-center shrink-0 border border-slate-700">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg h-7 w-7 flex items-center justify-center shrink-0 border border-blue-500/20 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3 bg-slate-800 text-slate-400 border border-slate-700/30 rounded-xl rounded-tl-none text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <form onSubmit={handleSend} className="bg-slate-900/60 p-3 border-t border-slate-800/80 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about NAAQS, NCAP, or AQI formula..."
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-500 font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center shrink-0 shadow shadow-blue-500/10"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
