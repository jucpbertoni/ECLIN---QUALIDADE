
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-10" }) => {
  return (
    <div className={`${className} flex items-center gap-2`}>
      <div className="flex items-center">
        {/* Brand Logo Image */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-brand-primary/20">
          <img 
            src="https://lh3.googleusercontent.com/d/1UpfI6s535U4MAMEHucl337DvlUjU8P4M" 
            alt="EC Logo" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://i.ibb.co/v4m1Z0w/eclin-logo.png";
            }}
            referrerPolicy="no-referrer"
          />
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
