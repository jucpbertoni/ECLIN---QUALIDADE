
import React from 'react';
import { QualityDocument, User } from '../types';

interface DocumentCardProps {
  doc: QualityDocument;
  user: User | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getExpirationAlert: (date: string) => { label: string; color: string; icon: string } | null;
}

const DocumentCard: React.FC<DocumentCardProps> = React.memo(({ doc, user, onEdit, onDelete, getExpirationAlert }) => {
  const alert = getExpirationAlert(doc.expirationDate);
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-brand-secondary/30 transition-shadow duration-200 group flex flex-col gap-4 shadow-sm hover:shadow-md relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="bg-brand-primary/5 p-3 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-200">
          <i className="fas fa-file-pdf text-xl"></i>
        </div>
        <div className="flex flex-col items-end gap-2">
          {alert && (
            <div className={`flex items-center gap-1.5 ${alert.color} text-[8px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md`}>
              <i className={`fas ${alert.icon}`}></i>
              {alert.label}
            </div>
          )}
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(doc.id)}
                className="text-slate-400 hover:text-brand-primary transition-colors p-1"
                title="Editar Título"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button 
                onClick={() => onDelete(doc.id)}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
                title="Excluir Documento"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-slate-800 text-sm mb-2 group-hover:text-brand-primary transition-colors leading-tight">{doc.title}</h4>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Validade: {doc.expirationDate}</span>
          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
          <span>{doc.uploadDate}</span>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <span className="text-[8px] font-black text-brand-secondary uppercase tracking-widest">Acesso Restrito</span>
        <button className="text-brand-primary hover:text-brand-dark transition-colors">
          <i className="fas fa-download"></i>
        </button>
      </div>
    </div>
  );
});

export default DocumentCard;
