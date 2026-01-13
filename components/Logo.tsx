
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-8" }) => {
  return (
    <div className={`${className} flex items-center gap-2`}>
      <div className="bg-brand-primary p-2 rounded-lg shadow-sm">
        <i className="fas fa-stethoscope text-white text-xl"></i>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-tight text-brand-dark leading-none uppercase">
          E<span className="text-brand-primary">CLIN</span>
        </span>
        <span className="text-[9px] font-bold text-brand-secondary uppercase tracking-[0.2em] mt-1">
          Portal da Qualidade
        </span>
      </div>
    </div>
  );
};

export default Logo;
