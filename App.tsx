
import React, { useState, useEffect } from 'react';
import { User, QualityDocument } from './types';
import AwarenessCarousel from './components/AwarenessCarousel';
import QualityAssistant from './components/QualityAssistant';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'upload' | 'signed'>('public');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<QualityDocument[]>([
    { id: '1', title: 'Manual de Qualidade ECLIN ONA v.1', type: 'pdf', status: 'published', uploader: 'Diretoria Executiva', uploadDate: '2024-03-01' },
    { id: '2', title: 'Protocolo de Identificação do Paciente', type: 'pdf', status: 'published', uploader: 'Comitê Gestor', uploadDate: '2024-03-15' },
    { id: '3', title: 'Política de Descarte de Resíduos ECLIN', type: 'pdf', status: 'published', uploader: 'Engenharia Clínica', uploadDate: '2024-03-20' },
  ]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setUser({ email, name: email.split('@')[0], role: 'user' });
      setActiveTab('upload');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('public');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'docx') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc: QualityDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name,
      type: type,
      status: type === 'docx' ? 'pending' : 'published',
      uploader: user?.name || 'Equipe ECLIN',
      uploadDate: new Date().toISOString().split('T')[0]
    };

    setDocuments(prev => [newDoc, ...prev]);
    setNotification(`Sucesso! Notificação enviada para engenharia.cd1@gmail.com sobre o arquivo: ${file.name}`);
  };

  return (
    <div className="min-h-screen bg-brand-light/40 text-slate-900 font-sans">
      {/* Notificação Toast */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-right-10 duration-300">
          <div className="bg-brand-primary text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border-l-4 border-brand-secondary">
            <i className="fas fa-check-circle text-brand-secondary"></i>
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-10">
              <Logo />
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('public')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'public' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                >
                  Acervo
                </button>
                <button 
                  onClick={() => setActiveTab('signed')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'signed' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                >
                  Homologados
                </button>
                {user && (
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'upload' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                  >
                    Submeter
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center text-white text-xs font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{user.name}</p>
                    <p className="text-[8px] text-brand-secondary font-bold uppercase tracking-widest">Equipe ECLIN</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-primary transition-colors"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveTab('public')}
                  className="bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20"
                >
                  Acesso Interno
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Área Principal */}
          <div className="lg:col-span-8 space-y-10">
            <AwarenessCarousel />

            {activeTab === 'public' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-brand-dark tracking-tight">Qualidade ECLIN</h2>
                    <p className="text-sm text-slate-500 font-medium">Controle de normas e protocolos assistenciais.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('signed')}
                    className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:shadow-xl transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                  >
                    <i className="fas fa-stamp text-brand-secondary"></i>
                    Documentos Validados ONA
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {documents.filter(d => d.type === 'pdf').map(doc => (
                    <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-brand-secondary/30 transition-all group flex items-start gap-4 shadow-sm hover:shadow-md">
                      <div className="bg-brand-primary/5 p-4 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                        <i className="fas fa-file-pdf text-2xl"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 text-sm mb-1 truncate group-hover:text-brand-primary transition-colors">{doc.title}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-brand-secondary uppercase tracking-widest">ONA V.2026</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{doc.uploadDate}</p>
                        </div>
                      </div>
                      <button className="text-slate-300 group-hover:text-brand-secondary mt-1">
                        <i className="fas fa-external-link-alt text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-16 rounded-[3rem] border-4 border-dashed border-slate-100 text-center space-y-6 hover:border-brand-secondary/40 transition-all group">
                   <div className="w-20 h-20 bg-brand-light rounded-3xl flex items-center justify-center mx-auto text-brand-primary group-hover:scale-110 transition-transform">
                    <i className="fas fa-file-medical text-3xl"></i>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-brand-dark">Protocolo de Arquivamento</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium text-sm">Envie PDFs de fluxogramas e manuais prontos para publicação no portal público ECLIN.</p>
                  </div>
                  <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdf')} className="hidden" id="pdf-upload" />
                  <label htmlFor="pdf-upload" className="inline-block px-10 py-4 brand-gradient text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all">
                    Anexar PDF
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'upload' && user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-center gap-5">
                  <div className="bg-brand-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-primary">
                    <i className="fas fa-signature text-2xl"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Fluxo de Assinatura ECLIN</h2>
                    <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest mt-1">Análise Crítica e Validação</p>
                  </div>
                </div>

                <div className="p-6 bg-brand-light rounded-2xl border border-brand-primary/10 text-brand-primary text-xs font-bold leading-relaxed flex gap-4">
                  <i className="fas fa-robot text-lg"></i>
                  <p>Atenção: Documentos em <strong>.docx (Word)</strong> submetidos nesta área ativam um gatilho de revisão prioritária para a Engenharia ECLIN em engenharia.cd1@gmail.com.</p>
                </div>

                <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-16 text-center space-y-6 hover:border-brand-primary/50 transition-all bg-slate-50/50">
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mx-auto text-brand-primary/20">
                    <i className="fas fa-file-word text-4xl"></i>
                  </div>
                  <div className="space-y-1 text-sm font-black text-slate-700 uppercase tracking-widest">
                    <p>Submeter Novo Documento para Assinatura</p>
                  </div>
                  <input type="file" accept=".docx" onChange={(e) => handleFileUpload(e, 'docx')} className="hidden" id="docx-upload" />
                  <label htmlFor="docx-upload" className="inline-block px-10 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/10">
                    Procurar Word (.docx)
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'signed' && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 brand-gradient opacity-10 rounded-bl-full"></div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-brand-secondary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-secondary">
                    <i className="fas fa-certificate text-2xl"></i>
                  </div>
                  <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Cofre de Documentos ONA</h2>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {documents.filter(d => d.status === 'published' || d.status === 'signed').map(doc => (
                    <div key={doc.id} className="p-5 flex items-center justify-between group bg-slate-50/50 rounded-2xl border border-transparent hover:border-brand-secondary hover:bg-white transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <i className="fas fa-check-double"></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm group-hover:text-brand-primary transition-colors">{doc.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Selo de Qualidade ECLIN • {doc.uploadDate}</p>
                        </div>
                      </div>
                      <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-brand-primary border border-brand-primary/20 rounded-lg hover:bg-brand-primary hover:text-white transition-all">
                        Validar Original
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barra Lateral */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* Caixa de Login */}
            {!user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-brand-dark mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <div className="w-2 h-6 bg-brand-secondary rounded-full"></div>
                  Portal ECLIN
                </h3>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Identificação Corporativa</label>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="equipe@eclin.com.br"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Chave de Segurança</label>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-xs font-bold"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full brand-gradient text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20">
                    Autenticar
                  </button>
                </form>
              </div>
            )}

            {/* Assistente de IA */}
            <div className="bg-brand-dark rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 brand-gradient opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative">
                <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  <i className="fas fa-brain text-brand-secondary"></i>
                  IA da ECLIN
                </h3>
                <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-[0.3em] mt-2">Consultor ONA Integrado</p>
              </div>
              <QualityAssistant />
            </div>

            {/* Indicadores ONA */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Métricas ECLIN 2026</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-brand-dark">Prontuário Digital</span>
                    <span className="text-sm font-black text-brand-primary">94%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-brand-primary w-[94%] rounded-full"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-light/50 p-4 rounded-2xl border border-brand-primary/5 text-center">
                    <p className="text-2xl font-black text-brand-primary">{documents.length}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acervo ONA</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-2xl font-black text-emerald-600">42</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aprovados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-slate-100 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <Logo className="h-8" />
            <div className="text-center md:text-right">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">© 2026 Portal da Qualidade ECLIN Gestão Hospitalar.</p>
              <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">
                <a href="#" className="hover:text-brand-secondary transition-colors">Normas</a>
                <a href="#" className="hover:text-brand-secondary transition-colors">Conformidade</a>
                <a href="#" className="hover:text-brand-secondary transition-colors">Suporte</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
