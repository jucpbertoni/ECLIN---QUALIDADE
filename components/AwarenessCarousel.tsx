
import React, { useState, useEffect } from 'react';
import { CampaignSlide } from '../types';

const slides: CampaignSlide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1080&h=1350',
    title: 'Excelência ECLIN',
    subtitle: 'Rumo à acreditação ONA com precisão e segurança.'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1080&h=1350',
    title: 'Padrão de Cuidado Nível 1',
    subtitle: 'Nossos processos garantem a segurança do paciente ECLIN.'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=1080&h=1350',
    title: 'Tecnologia em Saúde',
    subtitle: 'Inovação constante para a melhor gestão da qualidade.'
  }
];

const AwarenessCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/5] max-h-[600px] overflow-hidden rounded-[2.5rem] shadow-xl group border-4 border-white bg-slate-200">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover brightness-75 transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
            <span className="bg-brand-secondary text-brand-dark px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-3 shadow-lg">Campanha ECLIN 2026</span>
            <h2 className="text-3xl font-black mb-1 drop-shadow-md leading-tight">{slide.title}</h2>
            <p className="text-base opacity-90 font-medium max-w-sm">{slide.subtitle}</p>
          </div>
        </div>
      ))}
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === current ? 'bg-brand-secondary scale-125 w-4' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default AwarenessCarousel;
