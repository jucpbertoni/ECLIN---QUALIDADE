
import React, { useState, useEffect } from 'react';
import { User, QualityDocument, MuralPost } from './types.ts';
import AwarenessCarousel from './components/AwarenessCarousel.tsx';
import QualityAssistant from './components/QualityAssistant.tsx';
import Logo from './components/Logo.tsx';
import { CONFIG } from './config.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'upload' | 'signed' | 'mural'>('mural');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState(CONFIG.areas[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>(CONFIG.muralPosts);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [documents, setDocuments] = useState<QualityDocument[]>([
    { id: '1', title: `Manual de Qualidade ${CONFIG.brandName} ONA v.1`, type: 'pdf', status: 'published', uploader: 'Diretoria Executiva', uploadDate: '2024-03-01', area: 'Gestão de Qualidade e Biossegurança', expirationDate: '2026-03-01' },
    { id: '2', title: 'Protocolo de Identificação do Paciente', type: 'pdf', status: 'published', uploader: 'Comitê Gestor', uploadDate: '2024-03-15', area: 'Liderança Organizacional', expirationDate: '2026-03-15' },
    { id: '3', title: `Política de Descarte de Resíduos ${CONFIG.brandName}`, type: 'pdf', status: 'published', uploader: 'Engenharia Clínica', uploadDate: '2024-03-20', area: 'Engenharia Clínica', expirationDate: '2026-03-20' },
  ]);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Simple admin check for demo purposes
      const isAdmin = email.includes('admin') || email === 'juliana.engbio@gmail.com';
      setUser({ email, name: email.split('@')[0], role: isAdmin ? 'admin' : 'user' });
      setActiveTab('mural');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('public');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'docx') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'pdf' && !expirationDate) {
      setNotification("Por favor, selecione a data de validade para o documento oficial.");
      return;
    }

    const newDoc: QualityDocument = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name,
      type: type,
      status: type === 'docx' ? 'pending' : 'published',
      uploader: user?.name || `Equipe ${CONFIG.brandName}`,
      uploadDate: new Date().toISOString().split('T')[0],
      area: type === 'pdf' ? selectedArea : undefined,
      expirationDate: type === 'pdf' ? expirationDate : undefined
    };

    setDocuments(prev => [newDoc, ...prev]);
    setNotification(`Sucesso! Notificação enviada para ${CONFIG.notificationEmail} sobre o arquivo: ${file.name}`);
    setExpirationDate('');
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent) return;

    const newPost: MuralPost = {
      id: Math.random().toString(36).substr(2, 9),
      title: newPostTitle,
      content: newPostContent,
      date: new Date().toISOString().split('T')[0],
      image: newPostImage || undefined
    };

    setMuralPosts(prev => [newPost, ...prev]);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostImage('');
    setIsAddingPost(false);
    setNotification("Novo post adicionado ao Mural!");
  };

  const getExpirationAlert = (dateStr?: string) => {
    if (!dateStr) return null;
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { color: 'text-red-600', label: 'VENCIDO', icon: 'fa-exclamation-circle' };
    if (diffDays <= 15) return { color: 'text-red-500', label: 'VENCE EM 15 DIAS', icon: 'fa-clock' };
    if (diffDays <= 30) return { color: 'text-orange-500', label: 'VENCE EM 30 DIAS', icon: 'fa-clock' };
    if (diffDays <= 60) return { color: 'text-yellow-600', label: 'VENCE EM 60 DIAS', icon: 'fa-clock' };
    return null;
  };

  return (
    <div className="min-h-screen bg-brand-light/40 text-slate-900 font-sans">
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-right-10 duration-300">
          <div className="bg-brand-primary text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border-l-4 border-brand-secondary">
            <i className="fas fa-check-circle text-brand-secondary"></i>
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-10">
              <Logo />
              <div className="hidden md:flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('mural')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'mural' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                >
                  Mural
                </button>
                {user && (
                  <>
                    <button 
                      onClick={() => setActiveTab('public')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'public' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      {CONFIG.tabs.public}
                    </button>
                    <button 
                      onClick={() => setActiveTab('signed')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'signed' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      {CONFIG.tabs.signed}
                    </button>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'upload' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      {CONFIG.tabs.upload}
                    </button>
                  </>
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
                    <p className="text-[8px] text-brand-secondary font-bold uppercase tracking-widest">Equipe {CONFIG.brandName}</p>
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
          <div className="lg:col-span-8 space-y-10">
            <AwarenessCarousel />

            {activeTab === 'mural' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-end justify-between border-b-4 border-brand-dark pb-6">
                  <div>
                    <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em] mb-2 block">Campanha Ativa 2026</span>
                    <h2 className="text-6xl font-black text-brand-dark tracking-tighter uppercase leading-none">Qualidade <br/>em Ação</h2>
                  </div>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => setIsAddingPost(!isAddingPost)}
                      className="bg-brand-dark text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all"
                    >
                      {isAddingPost ? 'Cancelar' : 'Novo Post'}
                    </button>
                  )}
                </div>

                {isAddingPost && (
                  <div className="bg-white p-8 rounded-[2rem] border-2 border-brand-primary/20 shadow-xl space-y-6">
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">Novo Post no Mural</h3>
                    <form onSubmit={handleAddPost} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Título do Post"
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                          required
                        />
                        <input 
                          type="url" 
                          placeholder="URL da Imagem (Opcional)"
                          value={newPostImage}
                          onChange={(e) => setNewPostImage(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                      <textarea 
                        placeholder="Conteúdo do Post"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary min-h-[100px]"
                        required
                      />
                      <button type="submit" className="w-full brand-gradient text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs">
                        Publicar no Mural
                      </button>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-16">
                  {muralPosts.map((post, idx) => (
                    <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-10 group">
                      <div className="md:col-span-5 relative">
                        <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-transform duration-700">
                          <img 
                            src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'} 
                            alt={post.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 brand-gradient rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl rotate-12 group-hover:rotate-0 transition-transform">
                          0{muralPosts.length - idx}
                        </div>
                      </div>
                      <div className="md:col-span-7 flex flex-col justify-center space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="w-12 h-[2px] bg-brand-secondary"></span>
                          <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.3em]">{post.date}</span>
                        </div>
                        <h3 className="text-4xl font-black text-brand-dark leading-tight group-hover:text-brand-primary transition-colors">{post.title}</h3>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium">{post.content}</p>
                        <div className="pt-4">
                          <button className="text-[10px] font-black text-brand-dark uppercase tracking-[0.4em] border-b-2 border-brand-secondary pb-1 hover:text-brand-primary hover:border-brand-primary transition-all">
                            Ler mais detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'public' && user && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-brand-dark tracking-tight">Qualidade {CONFIG.brandName}</h2>
                    <p className="text-sm text-slate-500 font-medium">Controle de normas e protocolos assistenciais.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar documentos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary w-64 shadow-sm"
                      />
                    </div>
                    <button 
                      onClick={() => setActiveTab('signed')}
                      className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:shadow-xl transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                    >
                      <i className="fas fa-stamp text-brand-secondary"></i>
                      Validados ONA
                    </button>
                  </div>
                </div>

                {CONFIG.areas.map(area => {
                  const areaDocs = documents.filter(d => 
                    d.type === 'pdf' && 
                    d.area === area &&
                    (d.title.toLowerCase().includes(searchTerm.toLowerCase()) || area.toLowerCase().includes(searchTerm.toLowerCase()))
                  );
                  if (areaDocs.length === 0) return null;
                  return (
                    <div key={area} className="space-y-4">
                      <h3 className="text-sm font-black text-brand-secondary uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-1 h-4 bg-brand-secondary rounded-full"></div>
                        {area}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {areaDocs.map(doc => {
                          const alert = getExpirationAlert(doc.expirationDate);
                          return (
                            <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-brand-secondary/30 transition-all group flex flex-col gap-4 shadow-sm hover:shadow-md relative overflow-hidden">
                              <div className="flex items-start justify-between">
                                <div className="bg-brand-primary/5 p-3 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                                  <i className="fas fa-file-pdf text-xl"></i>
                                </div>
                                {alert && (
                                  <div className={`flex items-center gap-1.5 ${alert.color} text-[8px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md`}>
                                    <i className={`fas ${alert.icon}`}></i>
                                    {alert.label}
                                  </div>
                                )}
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
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-white p-12 rounded-[3rem] border-4 border-dashed border-slate-100 space-y-8 hover:border-brand-secondary/40 transition-all group">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center mx-auto text-brand-primary group-hover:scale-110 transition-transform">
                      <i className="fas fa-file-medical text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-black text-brand-dark">Upload de Documento Oficial</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium text-xs">Preencha os dados obrigatórios para publicação.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área Responsável</label>
                      <select 
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                      >
                        {CONFIG.areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                      <input 
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdf')} className="hidden" id="pdf-upload" />
                    <label htmlFor="pdf-upload" className="inline-block px-10 py-4 brand-gradient text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all">
                      Selecionar PDF e Enviar
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'upload' && user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-brand-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-primary">
                      <i className="fas fa-signature text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Fluxo de Assinatura {CONFIG.brandName}</h2>
                      <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest mt-1">Análise Crítica e Validação</p>
                    </div>
                  </div>
                  <a 
                    href={CONFIG.signingPlatformUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-brand-dark text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-primary transition-all shadow-lg"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    Plataforma de Assinatura
                  </a>
                </div>

                <div className="p-6 bg-brand-light rounded-2xl border border-brand-primary/10 text-brand-primary text-xs font-bold leading-relaxed flex gap-4">
                  <i className="fas fa-robot text-lg"></i>
                  <p>Atenção: Documentos em <strong>.doc / .docx (Word)</strong> ativam o gatilho de revisão prioritária enviada para {CONFIG.notificationEmail}.</p>
                </div>

                <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-16 text-center space-y-6 hover:border-brand-primary/50 transition-all bg-slate-50/50">
                  <input type="file" accept=".doc,.docx" onChange={(e) => handleFileUpload(e, 'docx')} className="hidden" id="docx-upload" />
                  <label htmlFor="docx-upload" className="inline-block px-10 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/10">
                    Procurar Word (.doc / .docx)
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'signed' && user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-5">
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
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Selo {CONFIG.brandName} • {doc.uploadDate}</p>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <p className="text-[9px] text-brand-secondary font-black uppercase tracking-widest">{doc.area}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-10">
            {!user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-brand-dark mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <div className="w-2 h-6 bg-brand-secondary rounded-full"></div>
                  Portal {CONFIG.brandName}
                </h3>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ID Corporativo</label>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`colaborador@${CONFIG.brandName.toLowerCase()}.com.br`}
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

            <div className="bg-brand-dark rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="relative">
                <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  <i className="fas fa-brain text-brand-secondary"></i>
                  IA da {CONFIG.brandName}
                </h3>
                <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-[0.3em] mt-2">Consultor ONA Integrado</p>
              </div>
              <QualityAssistant />
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Métricas {CONFIG.brandName} 2026</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-brand-dark">Conformidade</span>
                    <span className="text-sm font-black text-brand-primary">94%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-brand-primary w-[94%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <Logo />
            <div className="text-center md:text-right">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">© 2026 {CONFIG.portalTitle} {CONFIG.brandName}.</p>
              <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">
                <span>Conformidade</span>
                <span>Suporte</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
