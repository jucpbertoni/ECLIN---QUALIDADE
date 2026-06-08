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
  user?: any;
  onLogAction?: (action: string, details: string) => void;
}

const Countdown: React.FC<CountdownProps> = ({ isAdmin = false, user, onLogAction }) => {
  const [objective, setObjective] = useState('Rumo à ONA');
  const [subtitle, setSubtitle] = useState('Certificação 2026');
  const [targetDateStr, setTargetDateStr] = useState('2026-06-30T00:00:00');
  const [impactPhrase, setImpactPhrase] = useState('"A qualidade é a nossa prioridade absoluta."');
  const [completedMessage, setCompletedMessage] = useState('Chegamos ao dia planejado! Parabéns a toda a equipe de Qualidade e Colaboradores ECLIN pela excelência e engajamento.');
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Local edit states
  const [editObjective, setEditObjective] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editImpactPhrase, setEditImpactPhrase] = useState('');
  const [editCompletedMessage, setEditCompletedMessage] = useState('');

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync with Firestore in real-time
  useEffect(() => {
    const docRef = doc(db, 'settings', 'countdown');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.objective !== undefined) setObjective(data.objective);
        if (data.subtitle !== undefined) setSubtitle(data.subtitle);
        if (data.targetDate !== undefined) setTargetDateStr(data.targetDate);
        if (data.impactPhrase !== undefined) setImpactPhrase(data.impactPhrase);
        if (data.completedMessage !== undefined) setCompletedMessage(data.completedMessage);
      } else {
        // Se as configurações não existirem no Firestore, recria automaticamente com os valores padrão
        try {
          setDoc(docRef, {
            objective: 'Rumo à ONA',
            subtitle: 'Certificação 2026',
            targetDate: '2026-06-30T00:00:00',
            impactPhrase: '"A qualidade é a nossa prioridade absoluta."',
            completedMessage: 'Chegamos ao dia planejado! Parabéns a toda a equipe de Qualidade e Colaboradores ECLIN pela excelência e engajamento.'
          });
        } catch (e) {
          console.error("Erro ao criar configurações iniciais do timer:", e);
        }
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
    setEditCompletedMessage(completedMessage);
    setIsEditing(true);
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm("Deseja redefinir o contador e a meta para o padrão do Portal ECLIN?")) {
      try {
        const docRef = doc(db, 'settings', 'countdown');
        await setDoc(docRef, {
          objective: 'Rumo à ONA',
          subtitle: 'Certificação 2026',
          targetDate: '2026-06-30T00:00:00',
          impactPhrase: '"A qualidade é a nossa prioridade absoluta."',
          completedMessage: 'Chegamos ao dia planejado! Parabéns a toda a equipe de Qualidade e Colaboradores ECLIN pela excelência e engajamento.'
        });
        if (onLogAction) {
          onLogAction('TIMER_RESTORE', 'Restaurou as configurações padrões do contador da meta (Rumo à ONA 2026).');
        }
        setIsEditing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      } catch (err) {
        console.error("Erro ao redefinir padrões do timer:", err);
        alert("Erro ao redefinir as configurações padrões.");
      }
    }
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
        impactPhrase: editImpactPhrase.trim(),
        completedMessage: editCompletedMessage.trim() || 'Chegamos ao dia planejado! Parabéns a toda a equipe de Qualidade e Colaboradores ECLIN pela excelência e engajamento.'
      });
      if (onLogAction) {
        onLogAction('TIMER_EDIT', `Alterou as configurações da meta para: "${editObjective.trim()}" com data alvo definida como ${editTargetDate}.`);
      }
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar configurações do timer:", err);
      alert("Erro ao salvar as configurações. Verifique sua conexão e se as regras do banco permitem escrita.");
    }
  };

  const isCompleted = new Date(targetDateStr).getTime() <= Date.now();

  if (isEditing) {
    return (
      <div className="bg-[#0b1c24] border border-[#1b3c4a] p-6 sm:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-bl-full -mr-8 -mt-8"></div>
        
        <form onSubmit={handleSave} className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-brand-dark shadow-md">
              <i className="fas fa-edit text-sm"></i>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight text-white">Editar Meta e Contador</h4>
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Painel Administrativo ECLIN</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">Título do Objetivo</label>
              <input 
                type="text" 
                value={editObjective} 
                onChange={(e) => setEditObjective(e.target.value)}
                placeholder="Ex: Rumo à ONA / Certificação ECLIN" 
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-brand-primary text-white rounded-xl text-xs font-bold focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">Subtítulo / Ano da Meta</label>
              <input 
                type="text" 
                value={editSubtitle} 
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="Ex: Certificação 2026" 
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-brand-primary text-white rounded-xl text-xs font-bold focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">Data e Hora Almejada</label>
              <input 
                type="datetime-local" 
                value={editTargetDate} 
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-brand-primary text-white rounded-xl text-xs font-bold focus:outline-none transition-all"
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">Frase de Impacto</label>
              <textarea 
                rows={2}
                value={editImpactPhrase} 
                onChange={(e) => setEditImpactPhrase(e.target.value)}
                placeholder="Escreva uma frase inspiradora para engajar o time..." 
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-brand-primary text-white rounded-xl text-xs font-bold focus:outline-none resize-none transition-all"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">Mensagem de Conquista (Atingido o dia)</label>
              <textarea 
                rows={3}
                value={editCompletedMessage} 
                onChange={(e) => setEditCompletedMessage(e.target.value)}
                placeholder="Mensagem exibida quando o contador zerar..." 
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-brand-primary text-white rounded-xl text-xs font-bold focus:outline-none resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button 
              type="button" 
              onClick={handleRestoreDefaults}
              className="px-3 py-2 bg-rose-600/25 hover:bg-rose-600/40 text-rose-200 border border-rose-500/30 font-extrabold uppercase text-[9px] tracking-wider rounded-xl transition-all"
              title="Restaurar valores de certificação padrão da ECLIN"
            >
              Restaurar Padrões
            </button>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-amber-400 hover:bg-yellow-400 text-brand-dark font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md shadow-amber-400/20"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#0b1c24] border border-[#14313d] p-6 sm:p-8 lg:p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:border-amber-400/30">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-bl-full -mr-8 -mt-8 transition-all duration-500 group-hover:scale-110 group-hover:bg-amber-400/10"></div>
      
      {/* Admin Setting Button */}
      {isAdmin && (
        <button 
          onClick={handleStartEditing}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-amber-400 hover:text-brand-dark hover:scale-110 flex items-center justify-center text-slate-300 hover:text-brand-dark transition-all border border-white/11 shadow-sm"
          title="Editar meta e contador"
        >
          <i className="fas fa-cog text-xs"></i>
        </button>
      )}

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400 shadow-inner border border-amber-400/25 shrink-0">
            <i className={`fas ${isCompleted ? 'fa-trophy text-amber-400 animate-bounce' : 'fa-certificate'} text-base sm:text-lg`}></i>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate pr-8" title={objective}>
              {objective}
            </h4>
            <p className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest mt-0.5 truncate">
              {isCompleted ? 'Objetivo Alcançado!' : subtitle}
            </p>
          </div>
        </div>

        {isCompleted ? (
          <div className="bg-[#14313d] rounded-2xl p-4 border border-amber-400/20 text-center space-y-2 animate-feed shadow-inner">
            <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-400 flex items-center justify-center gap-2">
              🎉 Meta Conquistada!
            </p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-200 uppercase tracking-wide leading-relaxed">
              {completedMessage}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Dias', value: timeLeft.days },
              { label: 'Hrs', value: timeLeft.hours },
              { label: 'Min', value: timeLeft.minutes },
              { label: 'Seg', value: timeLeft.seconds }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/60 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center border border-white/5 transition-all duration-300 hover:bg-slate-900/80">
                <p className="text-lg sm:text-xl md:text-2xl font-black leading-none text-white tracking-tight">{item.value}</p>
                <p className="text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-widest mt-1 text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {impactPhrase && (
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-300/90 text-center tracking-wide leading-relaxed italic mt-6 px-1 drop-shadow-sm line-clamp-3" title={impactPhrase}>
            {impactPhrase}
          </p>
        )}

        {showSuccess && (
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl border border-emerald-400/20 text-[9px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 animate-bounce">
            <i className="fas fa-check-circle"></i> Meta atualizada com sucesso!
          </div>
        )}
      </div>
    </div>
  );
};

export default Countdown;
