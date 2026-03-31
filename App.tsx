
import React, { useState, useEffect } from 'react';
import { User, QualityDocument, MuralPost } from './types.ts';
import QualityAssistant from './components/QualityAssistant.tsx';
import IncidentNotification from './components/IncidentNotification.tsx';
import Countdown from './components/Countdown.tsx';
import Logo from './components/Logo.tsx';
import MuralCarousel from './components/MuralCarousel.tsx';
import { CONFIG } from './config.ts';
import { db, auth } from './src/firebase.ts';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'upload' | 'signed' | 'mural'>('mural');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState(CONFIG.areas[0]);
  const [selectedFilterArea, setSelectedFilterArea] = useState<string>('Todas as áreas');
  const [expirationDate, setExpirationDate] = useState('');
  
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [documents, setDocuments] = useState<QualityDocument[]>([]);

  // Firebase Real-time Sync
  useEffect(() => {
    const muralQuery = query(collection(db, 'mural_posts'), orderBy('date', 'desc'));
    const unsubMural = onSnapshot(muralQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MuralPost));
      // If empty, initialize with default config posts
      if (posts.length === 0) {
        CONFIG.muralPosts.forEach(async (post) => {
          try {
            const { id, ...postData } = post;
            await setDoc(doc(db, 'mural_posts', id), postData);
          } catch (e) {
            console.error("Error initializing mural posts", e);
          }
        });
      } else {
        setMuralPosts(posts);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mural_posts'));

    const unsubDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityDocument));
      if (docs.length === 0) {
        const initialDocs = [
          { id: '1', title: `Manual de Qualidade ${CONFIG.brandName} ONA v.1`, type: 'pdf', status: 'published', uploader: 'Diretoria Executiva', uploadDate: '2024-03-01', area: 'Gestão de Qualidade e Biossegurança', expirationDate: '2026-03-01' },
          { id: '2', title: 'Protocolo de Identificação do Paciente', type: 'pdf', status: 'published', uploader: 'Comitê Gestor', uploadDate: '2024-03-15', area: 'Liderança Organizacional', expirationDate: '2026-03-15' },
          { id: '3', title: `Política de Descarte de Resíduos ${CONFIG.brandName}`, type: 'pdf', status: 'published', uploader: 'Engenharia Clínica', uploadDate: '2024-03-20', area: 'Engenharia Clínica', expirationDate: '2026-03-20' },
        ];
        initialDocs.forEach(async (docItem) => {
          try {
            const { id, ...docData } = docItem;
            await setDoc(doc(db, 'documents', id), docData);
          } catch (e) {
            console.error("Error initializing documents", e);
          }
        });
      } else {
        setDocuments(docs);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'documents'));

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    return () => {
      unsubMural();
      unsubDocs();
    };
  }, []);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<MuralPost | null>(null);

  const handleMuralImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<MuralPost | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Get current password from localStorage or use default
  const getCurrentPassword = () => localStorage.getItem('eclin_portal_password') || 'Eclin2026';
  const isFirstAccess = () => !localStorage.getItem('eclin_portal_password');

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      const admins = ['qualidade@eclin.com.br', 'marketing@grupoeclin.com.br', 'rafael.dias@eclin.eng.br', 'juliana.engbio@gmail.com'];
      const isAdmin = admins.includes(email.toLowerCase());
      
      const validPassword = getCurrentPassword();

      if (password === validPassword) {
        if (isFirstAccess()) {
          setShowChangePassword(true);
          setNotification("Primeiro acesso detectado. Por favor, altere sua senha por segurança.");
        } else {
          setUser({ email, name: email.split('@')[0], role: isAdmin ? 'admin' : 'user' });
          setActiveTab('mural');
          setNotification(`Bem-vindo, ${email.split('@')[0]}!`);
        }
      } else {
        setNotification("Senha incorreta. Tente novamente.");
      }
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setNotification("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification("As senhas não coincidem.");
      return;
    }

    localStorage.setItem('eclin_portal_password', newPassword);
    const admins = ['qualidade@eclin.com.br', 'marketing@grupoeclin.com.br', 'rafael.dias@eclin.eng.br', 'juliana.engbio@gmail.com'];
    const isAdmin = admins.includes(email.toLowerCase());
    
    setUser({ email, name: email.split('@')[0], role: isAdmin ? 'admin' : 'user' });
    setShowChangePassword(false);
    setActiveTab('mural');
    setNotification("Senha alterada com sucesso! Bem-vindo ao portal.");
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('mural');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'docx') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'pdf' && !expirationDate) {
      setNotification("Por favor, selecione a data de validade para o documento oficial.");
      return;
    }

    const newDoc = {
      title: file.name,
      type: type,
      status: type === 'docx' ? 'pending' : 'published',
      uploader: user?.name || `Equipe ${CONFIG.brandName}`,
      uploadDate: new Date().toISOString().split('T')[0],
      area: type === 'pdf' ? selectedArea : undefined,
      expirationDate: type === 'pdf' ? expirationDate : undefined
    };

    try {
      await addDoc(collection(db, 'documents'), newDoc);
      setNotification(`Sucesso! Notificação enviada para ${CONFIG.notificationEmail} sobre o arquivo: ${file.name}`);
      setExpirationDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent) return;

    const postData = {
      title: newPostTitle,
      content: newPostContent,
      date: new Date().toISOString().split('T')[0],
      image: newPostImage || undefined
    };

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'mural_posts', editingPost.id), postData);
        setNotification("Post atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'mural_posts'), postData);
        setNotification("Novo post adicionado ao Mural!");
      }
      
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage('');
      setIsAddingPost(false);
      setEditingPost(null);
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'mural_posts');
    }
  };

  const startEditingPost = (post: MuralPost) => {
    setEditingPost(post);
    setNewPostTitle(post.title);
    setNewPostContent(post.content);
    setNewPostImage(post.image || '');
    setIsAddingPost(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este post do mural?")) {
      try {
        await deleteDoc(doc(db, 'mural_posts', id));
        setNotification("Post removido com sucesso.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `mural_posts/${id}`);
      }
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      try {
        await deleteDoc(doc(db, 'documents', id));
        setNotification("Documento removido com sucesso.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
      }
    }
  };

  const handleEditDocument = async (id: string) => {
    const docItem = documents.find(d => d.id === id);
    if (!docItem) return;
    
    const newTitle = window.prompt("Novo título para o documento:", docItem.title);
    if (newTitle && newTitle !== docItem.title) {
      try {
        await updateDoc(doc(db, 'documents', id), { title: newTitle });
        setNotification("Documento atualizado com sucesso.");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
      }
    }
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
                  {CONFIG.tabs.mural}
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
              {user && (
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
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {activeTab === 'mural' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex items-end justify-between border-b-4 border-brand-dark pb-6">
                  <div className="flex items-center gap-6">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1jsycEnW0eYwgRkvhw6mfckuDVeBrpacT" 
                      alt="Selo Qualidade" 
                      className="w-24 h-24 object-contain animate-pulse"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em] mb-2 block">Mural da Qualidade</span>
                      <h2 className="text-6xl font-black text-blue-600 tracking-tighter uppercase leading-none">Qualidade <br/>em Ação</h2>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => {
                        if (isAddingPost) {
                          setIsAddingPost(false);
                          setEditingPost(null);
                          setNewPostTitle('');
                          setNewPostContent('');
                          setNewPostImage('');
                        } else {
                          setIsAddingPost(true);
                        }
                      }}
                      className="bg-brand-dark text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all"
                    >
                      {isAddingPost ? 'Cancelar' : 'Novo Post'}
                    </button>
                  )}
                </div>

                <MuralCarousel 
                  posts={muralPosts} 
                  onSelectPost={setSelectedPost} 
                  onEditPost={startEditingPost}
                  isAdmin={user?.role === 'admin'}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:border-brand-primary/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                        <i className="fas fa-bullseye text-lg"></i>
                      </div>
                      <h4 className="text-sm font-black text-brand-dark uppercase tracking-tight">Nossa Missão</h4>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Impactar positivamente o setor da saúde construindo um futuro mais saudável e inovador.
                    </p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:border-brand-secondary/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-secondary/10 rounded-xl flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform">
                        <i className="fas fa-heart text-lg"></i>
                      </div>
                      <h4 className="text-sm font-black text-brand-dark uppercase tracking-tight">Nossos Valores</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Compromisso', 'Desenvolvimento Contínuo', 'Resultado', 'Segurança'].map(valor => (
                        <span key={valor} className="px-3 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-100">
                          {valor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {isAddingPost && (
                  <div className="bg-white p-8 rounded-[2rem] border-2 border-brand-primary/20 shadow-xl space-y-6">
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">
                      {editingPost ? 'Editar Post do Mural' : 'Novo Post no Mural'}
                    </h3>
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
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleMuralImageUpload}
                            className="hidden"
                            id="mural-image-upload"
                          />
                          <label 
                            htmlFor="mural-image-upload" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <span className="truncate">{newPostImage ? 'Imagem Selecionada' : 'Selecionar Imagem'}</span>
                            <i className="fas fa-camera text-brand-primary"></i>
                          </label>
                        </div>
                      </div>
                      {newPostImage && (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-100">
                          <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setNewPostImage('')}
                            className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                      <textarea 
                        placeholder="Conteúdo do Post"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary min-h-[100px]"
                        required
                      />
                      <button type="submit" className="w-full brand-gradient text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs">
                        {editingPost ? 'Salvar Alterações' : 'Publicar no Mural'}
                      </button>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-16">
                  {/* Optional: Show other posts below if needed, or just the carousel */}
                  {muralPosts.length > 3 && (
                    <div className="pt-10 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10">Histórico de Publicações</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {muralPosts.slice(3).map((post) => (
                          <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-brand-secondary/30 transition-all group shadow-sm hover:shadow-md">
                            <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                              <img src={post.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="space-y-3">
                              <span className="text-[8px] font-black text-brand-secondary uppercase tracking-widest">{post.date}</span>
                              <h5 className="text-lg font-black text-brand-dark leading-tight line-clamp-1">{post.title}</h5>
                              <p className="text-xs text-slate-500 line-clamp-2 font-medium">{post.content}</p>
                              <div className="pt-2 flex justify-between items-center">
                                <div className="flex gap-4">
                                  <button onClick={() => setSelectedPost(post)} className="text-[9px] font-black text-brand-primary uppercase tracking-widest border-b border-brand-primary/30 pb-0.5">Ver Post</button>
                                  {user?.role === 'admin' && (
                                    <button onClick={() => startEditingPost(post)} className="text-[9px] font-black text-brand-secondary uppercase tracking-widest border-b border-brand-secondary/30 pb-0.5">Editar</button>
                                  )}
                                </div>
                                {user?.role === 'admin' && (
                                  <button onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:text-red-600 transition-colors"><i className="fas fa-trash-alt"></i></button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'public' && user && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-brand-dark tracking-tight">Acervo {CONFIG.brandName}</h2>
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
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                  {['Todas as áreas', ...CONFIG.areas].map(area => (
                    <button
                      key={area}
                      onClick={() => setSelectedFilterArea(area)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedFilterArea === area 
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                        : 'bg-white text-slate-400 hover:text-brand-primary border border-slate-100'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {CONFIG.areas.filter(area => selectedFilterArea === 'Todas as áreas' || selectedFilterArea === area).map(area => {
                  const areaDocs = documents.filter(d => 
                    d.status === 'published' && 
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
                                        onClick={() => handleEditDocument(doc.id)}
                                        className="text-slate-400 hover:text-brand-primary transition-colors p-1"
                                        title="Editar Título"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteDocument(doc.id)}
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
                        })}
                      </div>
                    </div>
                  );
                })}

                {user?.role === 'admin' && (
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
                )}
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
            <Countdown />

            {!user && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-brand-dark mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <div className="w-1.5 h-5 bg-brand-secondary rounded-full"></div>
                  Acesso Interno
                </h3>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail Corporativo"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full brand-gradient text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                    Entrar
                  </button>
                </form>
              </div>
            )}

            <IncidentNotification />

            <div className="bg-brand-dark rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="relative">
                <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  <i className="fas fa-brain text-brand-secondary"></i>
                  IA da {CONFIG.brandName}
                </h3>
                <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-[0.3em] mt-2">Consultor da Qualidade Integrado</p>
              </div>
              <QualityAssistant />
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

      {/* Modal de Alteração de Senha (Primeiro Acesso) */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md"></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mx-auto">
                <i className="fas fa-shield-alt text-2xl"></i>
              </div>
              <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Segurança Obrigatória</h2>
              <p className="text-xs font-medium text-slate-500">Este é seu primeiro acesso. Para sua segurança, você deve definir uma nova senha pessoal.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                  required
                />
              </div>
              <button type="submit" className="w-full brand-gradient text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-xl shadow-brand-primary/20">
                Salvar e Acessar Portal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedPost(null)}
          ></div>
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-brand-dark hover:bg-brand-primary hover:text-white transition-all z-20"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            
            <div className="overflow-y-auto">
              <div className="relative aspect-video w-full">
                <img 
                  src={selectedPost.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'} 
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              </div>
              
              <div className="p-10 -mt-20 relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-[2px] bg-brand-secondary"></span>
                  <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.3em]">{selectedPost.date}</span>
                </div>
                <h2 className="text-5xl font-black text-brand-dark leading-tight tracking-tighter uppercase">{selectedPost.title}</h2>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 text-xl leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedPost.content}
                  </p>
                </div>
                
                <div className="pt-10 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center text-white text-xs font-bold">
                      E
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Equipe de Qualidade</p>
                      <p className="text-[8px] text-brand-secondary font-bold uppercase tracking-widest">Publicação Oficial {CONFIG.brandName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="bg-brand-dark text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all shadow-lg"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
