
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-10" }) => {
  return (
    <div className={`${className} flex items-center gap-2`}>
      <div className="flex items-center">
        {/* Circle with "ec" */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-brand-primary">
          <span className="text-black font-bold text-lg leading-none">ec</span>
        </div>
        {/* "eclin" text */}
        <div className="ml-2 flex flex-col justify-center">
          <span className="text-2xl font-black italic text-brand-secondary leading-none lowercase">
            eclin
          </span>
          <span className="text-[8px] font-bold text-brand-dark uppercase tracking-widest mt-0.5">
            Portal da Qualidade
          </span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
