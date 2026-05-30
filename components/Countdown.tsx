import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownProps {
  isAdmin?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ isAdmin = false }) => {
  const [objective, setObjective] = useState('Rumo à ONA');
  const [subtitle, setSubtitle] = useState('Certificação 2026');
  const [targetDateStr, setTargetDateStr] = useState('2026-06-30T00:00:00');
  const [impactPhrase, setImpactPhrase] = useState('"A qualidade é a nossa prioridade absoluta."');
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Local edit states
  const [editObjective, setEditObjective] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editImpactPhrase, setEditImpactPhrase] = useState('');

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync with Firestore in real-time
  useEffect(() => {
    const docRef = doc(db, 'settings', 'countdown');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.objective) setObjective(data.objective);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.targetDate) setTargetDateStr(data.targetDate);
        if (data.impactPhrase) setImpactPhrase(data.impactPhrase);
      }
    }, (error) => {
      console.error("Erro ao escutar configurações:", error);
    });
    return () => unsub();
  }, []);

  // Update timer every second
  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const targetTime = new Date(targetDateStr).getTime();
        const now = new Date().getTime();
        const distance = targetTime - now;

        if (isNaN(distance) || distance <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }

        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } catch (e) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft(); // Run initially
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  const handleStartEditing = () => {
    setEditObjective(objective);
    setEditSubtitle(subtitle);
    
    // Format targetDateStr to fit datetime-local (YYYY-MM-DDTHH:MM) if possible, or keep as is
    let formattedDate = targetDateStr;
    try {
      const d = new Date(targetDateStr);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch (e) {
      // Fallback
    }
    setEditTargetDate(formattedDate);
    setEditImpactPhrase(impactPhrase);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObjective.trim()) {
      alert("Por favor, preencha o objetivo.");
      return;
    }
    if (!editTargetDate) {
      alert("Por favor, preencha a data almejada.");
      return;
    }
    try {
      const docRef = doc(db, 'settings', 'countdown');
      await setDoc(docRef, {
        objective: editObjective.trim(),
        subtitle: editSubtitle.trim(),
        targetDate: editTargetDate,
        impactPhrase: editImpactPhrase.trim()
      });
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar configurações do timer:", err);
      alert("Erro ao salvar as configurações. Verifique sua conexão e se as regras do banco permitem escrita.");
    }
  };

  if (isEditing) {
    return (
      <div className="bg-brand-primary p-6 sm:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8"></div>
        
        <form onSubmit={handleSave} className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center text-brand-dark">
              <i className="fas fa-edit text-sm"></i>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight">Editar Meta e Contador</h4>
              <p className="text-[9px] font-bold text-brand-secondary uppercase tracking-widest">Painel Administrativo</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-brand-secondary block mb-1">Título do Objetivo</label>
              <input 
                type="text" 
                value={editObjective} 
                onChange={(e) => setEditObjective(e.target.value)}
                placeholder="Ex: Rumo à ONA / Certificação ECLIN" 
                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold focus:outline-none focus:border-brand-secondary"
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-brand-secondary block mb-1">Subtítulo / Ano da Meta</label>
              <input 
                type="text" 
                value={editSubtitle} 
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="Ex: Certificação 2026" 
                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold focus:outline-none focus:border-brand-secondary"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-brand-secondary block mb-1">Data e Hora Almejada</label>
              <input 
                type="datetime-local" 
                value={editTargetDate} 
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold focus:outline-none focus:border-brand-secondary color-scheme-dark"
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-brand-secondary block mb-1">Frase de Impacto</label>
              <textarea 
                rows={2}
                value={editImpactPhrase} 
                onChange={(e) => setEditImpactPhrase(e.target.value)}
                placeholder="Escreva uma frase inspiradora para engajar o time..." 
                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold focus:outline-none focus:border-brand-secondary resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-brand-secondary hover:bg-yellow-400 text-brand-dark font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md shadow-brand-secondary/15"
            >
              Salvar Meta
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-brand-primary p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
      
      {/* Botão administrativo para editar */}
      {isAdmin && (
        <button 
          onClick={handleStartEditing}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-brand-secondary hover:text-brand-dark hover:scale-110 flex items-center justify-center text-white transition-all border border-white/10 shadow-sm"
          title="Editar meta e contador"
        >
          <i className="fas fa-cog text-xs"></i>
        </button>
      )}

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center text-brand-dark shadow-lg">
            <i className="fas fa-certificate text-lg"></i>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight pr-8">{objective}</h4>
            <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Dias', value: timeLeft.days },
            { label: 'Hrs', value: timeLeft.hours },
            { label: 'Min', value: timeLeft.minutes },
            { label: 'Seg', value: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/10">
              <p className="text-xl font-black leading-none">{item.value}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-60">{item.label}</p>
            </div>
          ))}
        </div>

        {impactPhrase && (
          <p className="text-[10px] font-extrabold opacity-80 text-center tracking-wide leading-relaxed italic mt-6 px-1 drop-shadow-sm line-clamp-3" title={impactPhrase}>
            {impactPhrase}
          </p>
        )}

        {showSuccess && (
          <div className="p-2.5 bg-emerald-600/90 text-white rounded-xl border border-emerald-400/20 text-[9px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 animate-bounce">
            <i className="fas fa-check-circle"></i> Meta atualizada com sucesso!
          </div>
        )}
      </div>
    </div>
  );
};

export default Countdown;
