
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const IncidentNotification: React.FC = () => {
  const formUrl = "https://forms.gle/XntyfSBQLBihJrJX7";

  return (
    <div id="incident-notification-card" className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
          <i className="fas fa-exclamation-triangle text-lg"></i>
        </div>
        <div>
          <h4 className="text-sm font-black text-brand-dark uppercase tracking-tight">Notificação de Incidentes</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relate eventos adversos</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <QRCodeSVG value={formUrl} size={150} />
          </div>
          <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
            Aponte a câmera para o QR Code para acessar pelo celular
          </p>
        </div>

        <a 
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
        >
          <i className="fas fa-external-link-alt"></i>
          Acessar Formulário
        </a>
      </div>
    </div>
  );
};

export default IncidentNotification;
