
import React, { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Countdown: React.FC = () => {
  const targetDate = new Date('2026-06-30T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="bg-brand-primary p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center text-brand-dark shadow-lg">
            <i className="fas fa-certificate text-lg"></i>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight">Rumo à ONA</h4>
            <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Certificação 2026</p>
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

        <p className="text-[9px] font-medium opacity-70 text-center italic mt-6">
          "A qualidade é a nossa prioridade absoluta."
        </p>
      </div>
    </div>
  );
};

export default Countdown;
