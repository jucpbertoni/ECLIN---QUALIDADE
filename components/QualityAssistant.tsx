
import React, { useState } from 'react';
import { askQualityAssistant } from '../services/geminiService';

const QualityAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    const result = await askQualityAssistant(query);
    setResponse(result);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAsk} className="space-y-4">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dúvidas sobre o padrão ECLIN ONA?"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xs focus:ring-2 focus:ring-brand-secondary focus:border-transparent outline-none resize-none min-h-[100px] transition-all placeholder:text-white/30 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-secondary hover:bg-white text-brand-dark font-black py-3 px-6 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-brand-secondary/10 active:scale-95 text-[10px] uppercase tracking-widest"
        >
          {loading ? (
            <i className="fas fa-circle-notch fa-spin"></i>
          ) : (
            <>
              <i className="fas fa-microchip"></i>
              IA da ECLIN
            </>
          )}
        </button>
      </form>

      {response && (
        <div className="p-4 bg-white/10 rounded-xl border border-white/5 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 mb-2 text-brand-secondary">
            <i className="fas fa-comment-medical text-xs"></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Resposta Técnica</span>
          </div>
          <p className="text-xs text-white/90 leading-relaxed font-medium">{response}</p>
        </div>
      )}
    </div>
  );
};

export default QualityAssistant;
