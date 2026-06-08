
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { User, QualityDocument, MuralPost } from './types.ts';
import QualityAssistant from './components/QualityAssistant.tsx';
import IncidentNotification from './components/IncidentNotification.tsx';
import Countdown from './components/Countdown.tsx';
import Logo from './components/Logo.tsx';
import MuralCarousel from './components/MuralCarousel.tsx';
import { CONFIG } from './config.ts';
import { db, auth } from './src/firebase.ts';
import { signInAnonymously } from 'firebase/auth';
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
  getDocFromServer,
  getDoc
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
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    auth: auth.currentUser ? 'Authenticated' : 'Not Authenticated'
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
};

const logAction = async (currentUser: User | null, action: string, details: string) => {
  const isLocal = localStorage.getItem('eclin_contingency_mode') === 'true';
  const newLog = {
    timestamp: new Date().toISOString(),
    userEmail: currentUser?.email || 'anonimo@eclin.com.br',
    userName: currentUser ? `${currentUser.name} (${currentUser.areaBase || 'Eclin'})` : 'Visitante Anônimo',
    action,
    details
  };

  if (isLocal) {
    try {
      const rawLogs = localStorage.getItem('eclin_quality_logs');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      const logsWithId = [{ id: Math.random().toString(36).substring(2, 9), ...newLog }, ...logs];
      localStorage.setItem('eclin_quality_logs', JSON.stringify(logsWithId));
      if ((window as any).setAuditLogsGlobal) {
        (window as any).setAuditLogsGlobal(logsWithId);
      }
    } catch (e) {
      console.warn("Erro local ao registrar log de auditoria:", e);
    }
    return;
  }

  try {
    await addDoc(collection(db, 'quality_logs'), newLog);
  } catch (err) {
    console.warn("Erro ao registrar log de auditoria:", err);
  }
};

const ADMIN_EMAILS = [
  'qualidade@eclin.com.br',
  'marketing@grupoeclin.com.br',
  'rafael.dias@eclin.eng.br',
  'juliana.engbio@gmail.com',
  'qualidade',
  'juliana.engbio',
  'rafael.dias',
  'marketing'
];

const checkIsAdmin = (email: string | undefined | null) => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const prefix = clean.split('@')[0];
  return ADMIN_EMAILS.some(admin => {
    const a = admin.toLowerCase();
    return clean === a || prefix === a;
  });
};

interface DocumentCardProps {
  doc: QualityDocument;
  user: User | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getExpirationAlert: (dateStr?: string) => { color: string; label: string; icon: string } | null;
}

const DocumentCard = memo<DocumentCardProps>(({ doc, user, onEdit, onDelete, getExpirationAlert }) => {
  const alert = getExpirationAlert(doc.expirationDate);
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-brand-secondary/30 transition-all group flex flex-col gap-4 shadow-sm hover:shadow-md relative overflow-hidden">
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
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase text-slate-500 rounded">
            {doc.docType || 'Procedimento'}
          </span>
          <span className="px-2 py-0.5 bg-brand-primary/10 text-[8px] font-black uppercase text-brand-primary rounded">
            v{doc.version || '1.0'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Validade: {doc.expirationDate}</span>
          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
          <span>{doc.emissionDate || doc.uploadDate}</span>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <span className="text-[8px] font-black text-brand-secondary uppercase tracking-widest">Acesso Restrito</span>
        <div className="flex gap-3">
          <button 
            onClick={() => (window as any).handleOpen(doc)}
            className="text-brand-secondary hover:text-brand-dark transition-colors"
            title="Abrir para Leitura"
          >
            <i className="fas fa-eye"></i>
          </button>
          <button 
            onClick={() => (window as any).handleDownload(doc)}
            className="text-brand-primary hover:text-brand-dark transition-colors"
            title="Baixar Documento"
          >
            <i className="fas fa-download"></i>
          </button>
        </div>
      </div>
    </div>
  );
});

interface PendingReviewCardProps {
  docItem: QualityDocument;
  onApprove: (id: string, comment: string) => void;
  onDecline: (id: string, comment: string) => void;
  onDownload: (docItem: QualityDocument) => void;
  onDelete: (id: string) => void;
}

const PendingReviewCard = memo<PendingReviewCardProps>(({ docItem, onApprove, onDecline, onDownload, onDelete }) => {
  const [comment, setComment] = useState('');

  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 transition-all flex flex-col gap-5 hover:border-brand-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
            <i className="fas fa-file-word text-xl"></i>
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-800 text-sm leading-snug truncate max-w-[200px] sm:max-w-[350px]" title={docItem.title}>{docItem.title}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                Enviado em: {docItem.uploadDate}
              </p>
              <span className="text-slate-200 text-xs hidden sm:inline">•</span>
              {docItem.status === 'pending' && (
                <span className="bg-amber-100 text-amber-700 font-black text-[8px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Aguardando Revisão
                </span>
              )}
              {docItem.status === 'approved' && (
                <span className="bg-emerald-100 text-emerald-800 font-black text-[8px] uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                  <i className="fas fa-check-circle"></i> Aprovado
                </span>
              )}
              {docItem.status === 'rejected' && (
                <span className="bg-rose-100 text-rose-800 font-black text-[8px] uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                  <i className="fas fa-times-circle"></i> Recusado
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => onDownload(docItem)}
            className="bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            title="Baixar arquivo original"
          >
            <i className="fas fa-download text-xs"></i>
            Download (.docx)
          </button>
          <button 
            onClick={() => onDelete(docItem.id)}
            className="bg-red-50 hover:bg-rose-500 hover:text-white border border-red-100 p-2.5 rounded-xl transition-all text-red-500"
            title="Excluir submissão definitivamente"
          >
            <i className="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
        <div>
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Colaborador</span>
          <span className="text-slate-800 mt-0.5 block font-bold">{docItem.uploaderName || docItem.uploader?.split(" (")[0] || 'Não informado'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Área Base</span>
          <span className="text-brand-secondary font-black mt-0.5 block">{docItem.uploaderArea || 'Não informada'}</span>
        </div>
        <div>
          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">E-mail corporativo</span>
          {docItem.uploaderEmail ? (
            <a href={`mailto:${docItem.uploaderEmail}`} className="text-brand-primary font-bold hover:underline mt-0.5 block truncate">{docItem.uploaderEmail}</a>
          ) : (
            <span className="text-slate-400 mt-0.5 block">Não informado</span>
          )}
        </div>
      </div>

      {docItem.note && (
        <div className={`p-4 border rounded-xl text-xs ${docItem.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
          <p className="font-black text-[9px] uppercase tracking-wider mb-1 flex items-center gap-2">
            <i className={`fas ${docItem.status === 'approved' ? 'fa-check' : 'fa-exclamation-triangle'}`}></i> 
            Observações / Retorno da Qualidade
          </p>
          <p className="font-semibold">{docItem.note}</p>
        </div>
      )}

      {docItem.status === 'pending' && (
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">Observações / Justificativa</label>
            <textarea 
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Digite o feedback para o colaborador (obrigatório em caso de reprovação)..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-brand-primary outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => {
                if (!comment.trim()) {
                  alert("Por favor, preencha o campo de Justificativa para reprovar.");
                  return;
                }
                onDecline(docItem.id, comment);
              }}
              className="px-4 py-2 border border-red-200 hover:bg-rose-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Reprovar
            </button>
            <button 
              onClick={() => {
                onApprove(docItem.id, comment);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-600/10"
            >
              Aprovar Documento
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'upload' | 'signed' | 'mural' | 'review' | 'reports'>('mural');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState(CONFIG.areas[0]);
  const [selectedFilterArea, setSelectedFilterArea] = useState<string>('Todas as áreas');
  const [expirationDate, setExpirationDate] = useState('');

  // Define Contingency (Local Storage) Mode to bypass Firebase quota or connection failures
  const [useLocalStorageMode, setUseLocalStorageMode] = useState<boolean>(() => {
    return localStorage.getItem('eclin_contingency_mode') === 'true';
  });

  const saveMuralPostsLocal = (posts: MuralPost[]) => {
    localStorage.setItem('eclin_mural_posts', JSON.stringify(posts));
    setMuralPosts(posts);
  };

  const saveDocumentsLocal = (docs: QualityDocument[]) => {
    localStorage.setItem('eclin_documents', JSON.stringify(docs));
    setDocuments(docs);
  };

  // Upload custom fields
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocType, setCustomDocType] = useState('Procedimento');
  const [customDocVersion, setCustomDocVersion] = useState('1.0');
  const [customEmissionDate, setCustomEmissionDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Document Editing Modal
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocArea, setEditDocArea] = useState('');
  const [editDocType, setEditDocType] = useState('Procedimento');
  const [editDocVersion, setEditDocVersion] = useState('1.0');
  const [editDocEmissionDate, setEditDocEmissionDate] = useState('');
  const [editDocExpirationDate, setEditDocExpirationDate] = useState('');
  
  const [muralPosts, setMuralPosts] = useState<MuralPost[]>([]);
  const [documents, setDocuments] = useState<QualityDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [muralHeaderError, setMuralHeaderError] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Ensure user role is correct if admin list changes or on initial load
  useEffect(() => {
    if (user && user.email) {
      const isAdmin = checkIsAdmin(user.email);
      if (isAdmin && user.role !== 'admin') {
        setUser(prev => prev ? { ...prev, role: 'admin' } : null);
      } else if (!isAdmin && user.role === 'admin') {
        setUser(prev => prev ? { ...prev, role: 'user' } : null);
      }
    }
  }, [user]);
  
  useEffect(() => {
    setSelectedFile(null);
  }, [activeTab]);
  
  const hasSeededMural = useRef(false);
  const hasSeededDocs = useRef(false);

  // Sync quality_logs dynamically when authorized user is active
  useEffect(() => {
    const isUserAdmin = user && checkIsAdmin(user.email);
    const isQualidade = user && (user.email === 'qualidade@eclin.com.br' || user.email === 'juliana.engbio@gmail.com');
    
    if (!isUserAdmin && !isQualidade) {
      setAuditLogs([]);
      return;
    }

    if (useLocalStorageMode) {
      const rawLogs = localStorage.getItem('eclin_quality_logs');
      setAuditLogs(rawLogs ? JSON.parse(rawLogs) : []);
      return;
    }

    const logsQuery = query(collection(db, 'quality_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
    }, (error) => {
      console.warn("Sem permissão para ler logs:", error);
    });

    return () => unsub();
  }, [user, useLocalStorageMode]);

  // Firebase Real-time Sync
  useEffect(() => {
    if (useLocalStorageMode) {
      setIsFirebaseReady(true);
      
      // 1. Carrega posts do mural
      const rawMural = localStorage.getItem('eclin_mural_posts');
      let localPosts = rawMural ? JSON.parse(rawMural) : [];
      if (localPosts.length === 0) {
        localPosts = CONFIG.muralPosts;
        localStorage.setItem('eclin_mural_posts', JSON.stringify(localPosts));
      }
      setMuralPosts(localPosts);
      
      // 2. Carrega documentos
      const rawDocs = localStorage.getItem('eclin_documents');
      let localDocs = rawDocs ? JSON.parse(rawDocs) : [];
      if (localDocs.length === 0) {
        localDocs = [
          {
            id: 'doc-initial-1',
            title: 'Manual de Segurança Geral do Paciente',
            docType: 'Manual',
            status: 'published',
            version: '2.4',
            uploader: 'Qualidade ECLIN (Modo Local)',
            uploaderEmail: 'qualidade@eclin.com.br',
            uploaderArea: 'Gestão de Qualidade e Biossegurança',
            uploadDate: '2026-05-10',
            emissionDate: '2026-05-10',
            expirationDate: '2027-05-10',
            area: 'Gestão de Qualidade e Biossegurança',
            fileBase64PayLoad: 'sample'
          },
          {
            id: 'doc-initial-2',
            title: 'Procedimento Operacional Padrão - Higienização das Mãos',
            docType: 'Procedimento',
            status: 'published',
            version: '1.0',
            uploader: 'Administrador (Modo Local)',
            uploaderEmail: 'juliana.engbio@gmail.com',
            uploaderArea: 'Gestão de Qualidade e Biossegurança',
            uploadDate: '2026-05-12',
            emissionDate: '2026-05-12',
            expirationDate: '2028-05-12',
            area: 'Liderança Organizacional',
            fileBase64PayLoad: 'sample'
          }
        ];
        localStorage.setItem('eclin_documents', JSON.stringify(localDocs));
      }
      setDocuments(localDocs);
      
      // 3. Carrega logs de auditoria
      const rawLogs = localStorage.getItem('eclin_quality_logs');
      setAuditLogs(rawLogs ? JSON.parse(rawLogs) : []);

      // Registra a função globalmente para logAction atualizar o state
      (window as any).setAuditLogsGlobal = (updatedLogs: any[]) => {
        setAuditLogs(updatedLogs);
      };
      
      return;
    }

    const initFirebase = async () => {
      try {
        await signInAnonymously(auth);
        setIsFirebaseReady(true);
      } catch (err: any) {
        // Silently handle auth errors to avoid confusing the user, 
        // as we have relaxed firestore rules as a fallback.
        setIsFirebaseReady(true); 
      }
    };

    initFirebase();

    const muralQuery = query(collection(db, 'mural_posts'), orderBy('date', 'desc'));
    const unsubMural = onSnapshot(muralQuery, async (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MuralPost));
      setMuralPosts(posts);

      // Se o mural no Firestore estiver completamente vazio, recria com o post padrão CONFIG.muralPosts
      if (snapshot.empty && !hasSeededMural.current) {
        hasSeededMural.current = true;
        try {
          for (const post of CONFIG.muralPosts) {
            const { id, ...postFields } = post;
            await addDoc(collection(db, 'mural_posts'), postFields);
          }
        } catch (err) {
          console.error("Erro ao auto-inicializar dados do mural:", err);
        }
      }
    }, (error) => {
      console.warn("Erro ao carregar mural_posts:", error);
      const errStr = String(error).toLowerCase();
      if (errStr.includes("quota") || errStr.includes("exceeded") || errStr.includes("limit") || errStr.includes("recurso")) {
        setNotification("O limite diário de leitura do banco de dados (Cota Gratuita do Firebase) foi atingido. O mural de recados não pôde ser carregado.");
      }
    });

    const unsubDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityDocument));
      setDocuments(docs);
    }, (error) => {
      console.warn("Erro ao carregar documents:", error);
      const errStr = String(error).toLowerCase();
      if (errStr.includes("quota") || errStr.includes("exceeded") || errStr.includes("limit") || errStr.includes("recurso")) {
        setNotification("O limite diário de leitura do banco de dados (Cota Gratuita do Firebase) foi atingido. Os documentos de qualidade não puderam ser exibidos no momento.");
      }
    });

    return () => {
      unsubMural();
      unsubDocs();
    };
  }, [useLocalStorageMode]);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<MuralPost | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Memorização para evitar flickering (Ordenado Alfabeticamente)
  const filteredDocuments = useMemo(() => {
    return [...documents]
      .filter(d => 
        (selectedFilterArea === 'Todas as áreas' || d.area === selectedFilterArea) &&
        d.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
  }, [documents, selectedFilterArea, searchTerm]);

  const [selectedPost, setSelectedPost] = useState<MuralPost | null>(null);

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
  const [loginStep, setLoginStep] = useState<'email' | 'password' | 'register'>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regAreaBase, setRegAreaBase] = useState(CONFIG.areas[0]);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [tempUserDoc, setTempUserDoc] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (loginStep === 'email') {
      if (!cleanEmail) {
        setNotification("Por favor, digite seu e-mail corporativo.");
        return;
      }
      setIsAuthLoading(true);

      if (useLocalStorageMode) {
        try {
          const rawCollab = localStorage.getItem('eclin_collaborators');
          const collaborators = rawCollab ? JSON.parse(rawCollab) : {};
          const localCollab = collaborators[cleanEmail];
          
          if (localCollab) {
            setTempUserDoc(localCollab);
            setLoginStep('password');
            setNotification("E-mail identificado localmente! Por favor, informe sua senha.");
          } else {
            const isAdmin = checkIsAdmin(cleanEmail);
            if (isAdmin) {
              const defaultAdmin = {
                email: cleanEmail,
                firstName: cleanEmail.split('@')[0].split('.')[0] || "Administrador",
                lastName: "Eclin",
                areaBase: "Gestão de Qualidade e Biossegurança",
                password: "123456",
                role: "admin",
                createdAt: new Date().toISOString()
              };
              collaborators[cleanEmail] = defaultAdmin;
              localStorage.setItem('eclin_collaborators', JSON.stringify(collaborators));
              
              setTempUserDoc(defaultAdmin);
              setLoginStep('password');
              setNotification("Acesso Administrador configurado de emergência! Digite a senha padrão '123456' para entrar.");
            } else {
              setFirstName('');
              setLastName('');
              setRegPassword('');
              setRegConfirmPassword('');
              setLoginStep('register');
              setNotification("Primeiro acesso identificado localmente! Preencha as informações para cadastrar seu perfil.");
            }
          }
        } catch (localErr) {
          console.error("Erro local ao carregar colaborador:", localErr);
          setNotification("Erro local na leitura de dados.");
        } finally {
          setIsAuthLoading(false);
        }
        return;
      }

      try {
        const docRef = doc(db, 'collaborators', cleanEmail);
        let docSnap;
        try {
          // Tenta carregar usando getDoc normal (que aproveita cache local e conexões automáticas)
          docSnap = await getDoc(docRef);
        } catch (getDocErr) {
          console.warn("getDoc falhou, tentando do servidor diretamente:", getDocErr);
          // Se falhar, tenta forçar busca direto do servidor
          docSnap = await getDocFromServer(docRef);
        }
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTempUserDoc(data);
          setLoginStep('password');
          setNotification("E-mail identificado! Por favor, informe sua senha.");
        } else {
          setFirstName('');
          setLastName('');
          setRegPassword('');
          setRegConfirmPassword('');
          setLoginStep('register');
          setNotification("Primeiro acesso identificado! Preencha as informações para cadastrar seu perfil.");
        }
      } catch (error: any) {
        console.error("Erro ao verificar e-mail:", error);
        const errMessage = error instanceof Error ? error.message : String(error);
        const errLower = errMessage.toLowerCase();
        
        if (errLower.includes("quota") || errLower.includes("exceeded") || errLower.includes("limit") || errLower.includes("recurso") || errLower.includes("cota") || errLower.includes("excedida")) {
          setNotification("A cota gratuita diária de acessos ao banco de dados do Firebase (Firestore Spark Plan - 50.000 leituras/dia) foi esgotada hoje. O portal voltará a funcionar automaticamente amanhã à noite. Ative o plano gratuito flexível Blaze no Console do Firebase ou clique abaixo em 'Ativar Modo de Contingência (Local)' para entrar de imediato.");
        } else if (errLower.includes("permission") || errLower.includes("permissão") || errLower.includes("permission-denied")) {
          setNotification("Erro de acesso/permissão ao banco de dados (" + errMessage + "). Por favor, tente reiniciar seu navegador ou atualizar a página.");
        } else {
          setNotification("Erro ao conectar com o banco de dados (" + errMessage + "). Tente novamente ou use o Modo de Contingência (Local) de emergência abaixo.");
        }
      } finally {
        setIsAuthLoading(false);
      }
    } else if (loginStep === 'password') {
      if (!password) {
        setNotification("Por favor, digite sua senha de 6 dígitos.");
        return;
      }
      if (tempUserDoc && password === tempUserDoc.password) {
        const isAdmin = checkIsAdmin(cleanEmail);
        setUser({
          email: cleanEmail,
          name: `${tempUserDoc.firstName} ${tempUserDoc.lastName}`,
          role: isAdmin ? 'admin' : 'user',
          areaBase: tempUserDoc.areaBase
        });
        setActiveTab('mural');
        setNotification(`Bem-vindo de volta, ${tempUserDoc.firstName}!`);
        // Clean states
        setEmail('');
        setPassword('');
        setTempUserDoc(null);
        setLoginStep('email');
      } else {
        setNotification("Senha incorreta. Tente novamente.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!firstName.trim() || !lastName.trim()) {
      setNotification("Por favor, informe seu nome e sobrenome.");
      return;
    }
    if (regPassword.length !== 6 || !/^\d{6}$/.test(regPassword)) {
      setNotification("A senha deve ter exatamente 6 dígitos numéricos.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setNotification("As senhas informadas não coincidem.");
      return;
    }

    setIsAuthLoading(true);
    const newUser = {
      email: cleanEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      areaBase: regAreaBase,
      password: regPassword,
      role: checkIsAdmin(cleanEmail) ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    try {
      if (useLocalStorageMode) {
        const rawCollab = localStorage.getItem('eclin_collaborators');
        const collaborators = rawCollab ? JSON.parse(rawCollab) : {};
        collaborators[cleanEmail] = newUser;
        localStorage.setItem('eclin_collaborators', JSON.stringify(collaborators));
        
        setUser({
          email: cleanEmail,
          name: `${newUser.firstName} ${newUser.lastName}`,
          role: newUser.role,
          areaBase: newUser.areaBase
        });
        setActiveTab('mural');
        setNotification(`Cadastro realizado com sucesso localmente! Bem-vindo, ${newUser.firstName}!`);
      } else {
        await setDoc(doc(db, 'collaborators', cleanEmail), newUser);
        setUser({
          email: cleanEmail,
          name: `${newUser.firstName} ${newUser.lastName}`,
          role: newUser.role,
          areaBase: newUser.areaBase
        });
        setActiveTab('mural');
        setNotification(`Cadastro realizado com sucesso! Bem-vindo, ${newUser.firstName}!`);
      }
      // Reset registration states
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRegPassword('');
      setRegConfirmPassword('');
      setLoginStep('email');
    } catch (error: any) {
      console.error("Erro ao registrar colaborador:", error);
      const errMessage = error instanceof Error ? error.message : String(error);
      setNotification(`Erro ao salvar cadastro (${errMessage}). Verifique sua conexão.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginStep('email');
    setEmail('');
    setPassword('');
    setTempUserDoc(null);
    setActiveTab('mural');
  };

  const triggerSubmissionEmail = (fileName: string) => {
    const subject = encodeURIComponent(`[Portal Qualidade] Revisão de Documento - ${fileName}`);
    const body = encodeURIComponent(
      `Prezada Equipe de Qualidade,\n\n` +
      `Estou enviando o arquivo "${fileName}" para revisão e validação no sistema.\n\n` +
      `Detalhes do Envio:\n` +
      `- Colaborador: ${user?.name || 'Não identificado'}\n` +
      `- E-mail: ${user?.email || 'Não identificado'}\n` +
      `- Área/Base: ${user?.areaBase || 'Não identificada'}\n` +
      `- Data de Envio: ${new Date().toLocaleDateString('pt-BR')}\n\n` +
      `Por favor, encontre o documento em anexo (ou acesse a revisão pendente pelo portal).\n\n` +
      `Atenciosamente,\n` +
      `${user?.name || 'Colaborador Eclin'}`
    );
    const mailtoUrl = `mailto:${CONFIG.notificationEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const sendEmailWithBackend = async (
    type: 'submission' | 'approval' | 'rejection',
    fileName: string,
    uploaderName: string,
    uploaderEmail: string,
    uploaderArea: string,
    justification?: string
  ) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          fileName,
          userName: uploaderName,
          userEmail: uploaderEmail,
          userArea: uploaderArea,
          destinationEmail: CONFIG.notificationEmail,
          justification,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.warning === "SMTP_NOT_CONFIGURED") {
          return { success: true, warning: true, message: data.message };
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || "Erro desconhecido." };
      }
    } catch (err: any) {
      console.error("Erro ao fazer requisição de e-mail:", err);
      return { success: false, error: err.message };
    }
  };

  const handleFileUpload = async (type: 'pdf' | 'docx') => {
    if (!selectedFile) return;
    
    if (type === 'pdf' && user?.role !== 'admin') {
      setNotification("Apenas administradores podem enviar documentos oficiais.");
      return;
    }
    
    const file = selectedFile;
    const isTooLarge = file.size > 0.75 * 1024 * 1024;

    // For PDFs, we enforce maximum size
    if (type === 'pdf' && isTooLarge) {
      setNotification("O arquivo é muito grande (máximo 750KB para garantir o salvamento). Por favor, reduza o tamanho do PDF.");
      return;
    }

    if (type === 'pdf' && !expirationDate) {
      setNotification("Por favor, selecione a data de validade para o documento oficial.");
      return;
    }

    setIsUploading(true);

    const resetUploadStates = () => {
      setExpirationDate('');
      setSelectedFile(null);
      setCustomDocTitle('');
      setCustomDocType('Procedimento');
      setCustomDocVersion('1.0');
      setCustomEmissionDate(new Date().toISOString().split('T')[0]);
    };

    if (useLocalStorageMode) {
      if (type === 'docx' && isTooLarge) {
        const id = Math.random().toString(36).substring(2, 9);
        const newDoc: any = {
          id,
          title: customDocTitle || file.name,
          type: type,
          status: 'pending',
          uploader: user ? `${user.name} (${user.areaBase || 'Eclin'})` : `Equipe ${CONFIG.brandName}`,
          uploaderEmail: user?.email || '',
          uploaderName: user?.name || '',
          uploaderArea: user?.areaBase || '',
          uploadDate: new Date().toISOString().split('T')[0],
          area: user?.areaBase || 'Qualidade',
          docType: customDocType,
          version: customDocVersion,
          emissionDate: customEmissionDate,
          expirationDate: expirationDate || '',
          note: "Documento registrado por metadados devido ao tamanho."
        };

        const updatedDocs = [newDoc, ...documents];
        saveDocumentsLocal(updatedDocs);
        await logAction(user, 'DOC_UPLOAD', `Registrou os metadados (envio offline por tamanho) do documento local: "${newDoc.title}".`);
        setNotification("O envio local de metadados foi registrado!");
        resetUploadStates();
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const id = Math.random().toString(36).substring(2, 9);
        const newDoc: any = {
          id,
          title: customDocTitle || file.name,
          type: type,
          status: type === 'docx' ? 'pending' : 'published',
          uploader: user ? `${user.name} (${user.areaBase || 'Eclin'})` : `Equipe ${CONFIG.brandName}`,
          uploaderEmail: user?.email || '',
          uploaderName: user?.name || '',
          uploaderArea: user?.areaBase || '',
          uploadDate: new Date().toISOString().split('T')[0],
          area: type === 'pdf' ? selectedArea : (user?.areaBase || 'Qualidade'),
          docType: customDocType,
          version: customDocVersion,
          emissionDate: customEmissionDate,
          expirationDate: expirationDate || '',
          fileData: base64Data
        };

        const updatedDocs = [newDoc, ...documents];
        saveDocumentsLocal(updatedDocs);
        await logAction(user, 'DOC_UPLOAD', `Enviou com sucesso o documento local "${newDoc.title}".`);
        if (type === 'docx') {
          setNotification("Sucesso! O documento foi submetido com sucesso localmente.");
        } else {
          setNotification(`Sucesso! Arquivo "${customDocTitle || file.name}" enviado localmente.`);
        }
        resetUploadStates();
        setIsUploading(false);
      };

      reader.onerror = () => {
        setNotification("Erro local ao ler o arquivo. Tente novamente.");
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
      return;
    }

    if (type === 'docx' && isTooLarge) {
      // Inserção direta de metadados para arquivos grandes para evitar o popup de email fallback
      const newDoc: any = {
        title: customDocTitle || file.name,
        type: type,
        status: 'pending',
        uploader: user ? `${user.name} (${user.areaBase || 'Eclin'})` : `Equipe ${CONFIG.brandName}`,
        uploaderEmail: user?.email || '',
        uploaderName: user?.name || '',
        uploaderArea: user?.areaBase || '',
        uploadDate: new Date().toISOString().split('T')[0],
        area: user?.areaBase || 'Qualidade',
        docType: customDocType,
        version: customDocVersion,
        emissionDate: customEmissionDate,
        expirationDate: expirationDate || '',
        note: "Documento registrado por metadados devido ao tamanho."
      };

      try {
        await addDoc(collection(db, 'documents'), newDoc);
        await logAction(user, 'DOC_UPLOAD', `Registrou os metadados (envio offline por tamanho) do documento: "${newDoc.title}" (${newDoc.docType}, v${newDoc.version}, Área: ${newDoc.area}).`);
        setNotification("O envio foi registrado! Como o arquivo é muito grande (máximo 750KB), envie o arquivo à parte por e-mail para qualidade@eclin.com.br.");
        resetUploadStates();
      } catch (error: any) {
        handleFirestoreError(error, OperationType.CREATE, 'documents');
        setNotification("Erro ao registrar os metadados do documento.");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      
      const newDoc: any = {
        title: customDocTitle || file.name,
        type: type,
        status: type === 'docx' ? 'pending' : 'published',
        uploader: user ? `${user.name} (${user.areaBase || 'Eclin'})` : `Equipe ${CONFIG.brandName}`,
        uploaderEmail: user?.email || '',
        uploaderName: user?.name || '',
        uploaderArea: user?.areaBase || '',
        uploadDate: new Date().toISOString().split('T')[0],
        area: type === 'pdf' ? selectedArea : (user?.areaBase || 'Qualidade'),
        docType: customDocType,
        version: customDocVersion,
        emissionDate: customEmissionDate,
        expirationDate: expirationDate || '',
        fileData: base64Data
      };

      try {
        await addDoc(collection(db, 'documents'), newDoc);
        await logAction(user, 'DOC_UPLOAD', `Enviou com sucesso o documento "${newDoc.title}" (${newDoc.docType}, v${newDoc.version}, Área: ${newDoc.area}).`);
        if (type === 'docx') {
          setNotification("Sucesso! O documento foi submetido com sucesso para a fila de revisão da Qualidade.");
        } else {
          setNotification(`Sucesso! Arquivo "${customDocTitle || file.name}" enviado para o acervo.`);
        }
        resetUploadStates();
      } catch (error: any) {
        console.warn("Falha ao salvar no banco com arquivo anexo, tentando salvar sem o anexo...", error);
        
        // Retry saving metadata only so the action is registered in the database, stripping the heavy base64 payload
        try {
          const metadataDoc = { ...newDoc, fileData: undefined, note: "Documento salvo apenas em metadados devido ao tamanho." };
          // Clean undefined keys for security rules/Firebase Web Client
          delete metadataDoc.fileData;
          
          await addDoc(collection(db, 'documents'), metadataDoc);
          await logAction(user, 'DOC_UPLOAD', `Enviou metadados (reserva por anexo pesado) de "${metadataDoc.title}" (${metadataDoc.docType}, v${metadataDoc.version}, Área: ${metadataDoc.area}).`);
          if (type === 'docx') {
            setNotification("Sucesso! Metadados registrados com sucesso na fila de revisão.");
          } else {
            setNotification(`Sucesso! Metadados de "${customDocTitle || file.name}" registrados, mas o arquivo é muito grande para visualização interna.`);
          }
          resetUploadStates();
        } catch (retryError: any) {
          handleFirestoreError(retryError, OperationType.CREATE, 'documents');
          if (retryError.message?.includes('permission-denied')) {
            setNotification("Erro de permissão no banco de dados. Por favor, tente novamente em instantes.");
          } else {
            setNotification("Erro ao salvar no banco de dados. Verifique sua conexão e tente novamente.");
          }
        }
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setNotification("Erro ao ler o arquivo. Tente novamente.");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent) return;

    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem gerenciar o mural.");
      return;
    }

    const postData = {
      title: newPostTitle,
      content: newPostContent,
      date: new Date().toISOString().split('T')[0],
      image: newPostImage || undefined
    };

    if (useLocalStorageMode) {
      const id = editingPost ? editingPost.id : Math.random().toString(36).substring(2, 9);
      const postWithId = { id, ...postData };
      let updatedList = [...muralPosts];
      
      if (editingPost) {
        updatedList = updatedList.map(p => p.id === editingPost.id ? postWithId : p);
        saveMuralPostsLocal(updatedList);
        await logAction(user, 'MURAL_UPDATE', `Atualizou o post do mural localmente: "${postData.title}".`);
        setNotification("Post atualizado com sucesso localmente!");
      } else {
        updatedList = [postWithId, ...updatedList];
        saveMuralPostsLocal(updatedList);
        await logAction(user, 'MURAL_CREATE', `Criou o post do mural localmente: "${postData.title}".`);
        setNotification("Novo post adicionado ao Mural localmente!");
      }

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage('');
      setIsAddingPost(false);
      setEditingPost(null);
      return;
    }

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'mural_posts', editingPost.id), postData);
        await logAction(user, 'MURAL_UPDATE', `Atualizou o post do mural: "${postData.title}".`);
        setNotification("Post atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'mural_posts'), postData);
        await logAction(user, 'MURAL_CREATE', `Criou o post do mural: "${postData.title}".`);
        setNotification("Novo post adicionado ao Mural!");
      }
      
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage('');
      setIsAddingPost(false);
      setEditingPost(null);
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'mural_posts');
      setNotification("Erro ao salvar post no mural. Verifique os campos e tente novamente.");
    }
  };

  const startEditingPost = useCallback((post: MuralPost) => {
    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem editar postagens.");
      return;
    }
    setEditingPost(post);
    setNewPostTitle(post.title);
    setNewPostContent(post.content);
    setNewPostImage(post.image || '');
    setIsAddingPost(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [user]);

  const handleSelectPost = useCallback((post: MuralPost) => {
    setSelectedPost(post);
  }, []);

  const handleDeletePost = useCallback(async (id: string) => {
    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem excluir posts.");
      return;
    }
    if (useLocalStorageMode) {
      if (window.confirm("Tem certeza que deseja excluir este post do mural?")) {
        const postItem = muralPosts.find(p => p.id === id);
        const updatedList = muralPosts.filter(p => p.id !== id);
        saveMuralPostsLocal(updatedList);
        await logAction(user, 'MURAL_DELETE', `Excluiu o post do mural localmente: "${postItem ? postItem.title : id}".`);
        setNotification("Post removido com sucesso localmente.");
      }
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir este post do mural?")) {
      try {
        const postItem = muralPosts.find(p => p.id === id);
        await deleteDoc(doc(db, 'mural_posts', id));
        await logAction(user, 'MURAL_DELETE', `Excluiu o post do mural: "${postItem ? postItem.title : id}".`);
        setNotification("Post removido com sucesso.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `mural_posts/${id}`);
        setNotification("Erro ao excluir post. Verifique suas permissões.");
      }
    }
  }, [user, muralPosts, useLocalStorageMode]);

  const handleResetMural = async () => {
    if (window.confirm("Deseja redefinir o mural com os posts padrão do Portal ECLIN? Isso apagará os avisos atuais e restaurará os padrões originais.")) {
      if (useLocalStorageMode) {
        saveMuralPostsLocal(CONFIG.muralPosts);
        await logAction(user, 'MURAL_RESET', 'Restaurou o mural de recados e avisos para as configurações padrão ECLIN localmente.');
        setNotification("Mural do portal redefinido com sucesso localmente!");
        return;
      }
      try {
        // Exclui todos os posts atuais do mural
        for (const post of muralPosts) {
          await deleteDoc(doc(db, 'mural_posts', post.id));
        }
        
        // Insere novamente os posts do CONFIG.muralPosts
        for (const post of CONFIG.muralPosts) {
          const { id, ...postFields } = post;
          await addDoc(collection(db, 'mural_posts'), postFields);
        }
        
        await logAction(user, 'MURAL_RESET', 'Restaurou o mural de recados e avisos para as configurações padrão ECLIN.');
        setNotification("Mural do portal redefinido com sucesso!");
      } catch (err) {
        console.error("Erro ao redefinir mural:", err);
        setNotification("Erro ao redefinir o mural de recados.");
      }
    }
  };

  const handleDeleteDocument = useCallback(async (id: string) => {
    const docItem = documents.find(d => d.id === id);
    if (!docItem) {
      setNotification("Documento não encontrado no sistema.");
      return;
    }

    const isOwner = docItem.uploaderEmail === user?.email;
    const isAdmin = user?.role === 'admin';

    if (!isAdmin && !isOwner) {
      setNotification("Apenas administradores ou o autor da submissão podem excluir este documento.");
      return;
    }

    const confirmMsg = isAdmin 
      ? `Tem certeza que deseja excluir permanentemente o documento "${docItem.title}"?`
      : `Deseja realmente apagar o seu envio de teste "${docItem.title}"?`;

    if (window.confirm(confirmMsg)) {
      if (useLocalStorageMode) {
        const updatedList = documents.filter(d => d.id !== id);
        saveDocumentsLocal(updatedList);
        await logAction(user, 'DOC_DELETE', `Excluiu permanentemente o documento local: "${docItem.title}".`);
        setNotification("Documento removido localmente com sucesso.");
        return;
      }
      try {
        await deleteDoc(doc(db, 'documents', id));
        await logAction(user, 'DOC_DELETE', `Excluiu permanentemente o documento: "${docItem.title}" (${docItem.docType}, v${docItem.version}, Área: ${docItem.area}).`);
        setNotification("Documento removido do portal com sucesso.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
        setNotification("Erro ao excluir documento do banco de dados.");
      }
    }
  }, [documents, user, useLocalStorageMode]);

  const handleEditDocument = useCallback((id: string) => {
    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem editar documentos.");
      return;
    }
    const docItem = documents.find(d => d.id === id);
    if (!docItem) return;

    setEditingDocId(id);
    setEditDocTitle(docItem.title || '');
    setEditDocArea(docItem.area || CONFIG.areas[0]);
    setEditDocType(docItem.docType || 'Procedimento');
    setEditDocVersion(docItem.version || '1.0');
    setEditDocEmissionDate(docItem.emissionDate || docItem.uploadDate || new Date().toISOString().split('T')[0]);
    setEditDocExpirationDate(docItem.expirationDate || '');
    setIsEditingDoc(true);
  }, [documents, user]);

  const handleSaveDocEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocId) return;

    if (useLocalStorageMode) {
      const updatedList = documents.map(d => {
        if (d.id === editingDocId) {
          return {
            ...d,
            title: editDocTitle,
            area: editDocArea,
            docType: editDocType,
            version: editDocVersion,
            emissionDate: editDocEmissionDate,
            expirationDate: editDocExpirationDate
          };
        }
        return d;
      });
      saveDocumentsLocal(updatedList);
      await logAction(user, 'DOC_EDIT', `Editou o documento local: "${editDocTitle}".`);
      setNotification("Documento atualizado localmente com sucesso!");
      setIsEditingDoc(false);
      setEditingDocId(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'documents', editingDocId), {
        title: editDocTitle,
        area: editDocArea,
        docType: editDocType,
        version: editDocVersion,
        emissionDate: editDocEmissionDate,
        expirationDate: editDocExpirationDate
      });
      await logAction(user, 'DOC_EDIT', `Editou as informações do documento: "${editDocTitle}" (${editDocType}, v${editDocVersion}, Área: ${editDocArea}).`);
      setNotification("Documento atualizado com sucesso!");
      setIsEditingDoc(false);
      setEditingDocId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${editingDocId}`);
      setNotification("Erro ao atualizar o documento.");
    }
  };

  const downloadListaMestra = () => {
    // Only documents in the acervo (or all)
    const activeDocs = documents.filter(d => d.status === 'published' || d.status === 'signed' || d.status === 'approved');
    
    // Headers
    const headers = [
      'Nome do Documento',
      'Área Responsável',
      'Data da Emissão',
      'Data de Validade',
      'Tipo de Documento',
      'Versão'
    ];
    
    // Rows
    const rows = activeDocs.map(d => [
      d.title || '',
      d.area || '',
      d.emissionDate || d.uploadDate || '',
      d.expirationDate || '',
      d.docType || 'Procedimento',
      d.version || '1.0'
    ]);
    
    // Convert to CSV with semicolon delimiter (Portuguese standard for Excel double click)
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
    ].join('\n');
    
    // UTF-8 BOM to display accented characters correctly in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lista_mestra_qualidade_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApproveDocument = useCallback(async (id: string, comment: string) => {
    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem avaliar documentos.");
      return;
    }
    const docItem = documents.find(d => d.id === id);
    if (!docItem) return;

    if (useLocalStorageMode) {
      const finalComment = comment.trim() || "Documento aprovado na etapa de revisão da Qualidade.";
      const updatedList = documents.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status: 'approved' as const,
            note: finalComment
          };
        }
        return d;
      });
      saveDocumentsLocal(updatedList);
      await logAction(user, 'DOC_APPROVE', `Aprovou o documento local "${docItem.title}" na etapa de revisão da Qualidade.`);
      setNotification("Sucesso! Documento aprovado localmente.");
      return;
    }

    try {
      const finalComment = comment.trim() || "Documento aprovado na etapa de revisão da Qualidade.";
      await updateDoc(doc(db, 'documents', id), {
        status: 'approved',
        note: finalComment
      });
      await logAction(user, 'DOC_APPROVE', `Aprovou o documento "${docItem.title}" na etapa de revisão da Qualidade.`);

      setNotification("Sucesso! Documento aprovado na etapa de revisão da Qualidade.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
      setNotification("Erro ao atualizar aprovação do documento.");
    }
  }, [documents, user, useLocalStorageMode]);

  const handleDeclineDocument = useCallback(async (id: string, comment: string) => {
    if (user?.role !== 'admin') {
      setNotification("Apenas administradores podem avaliar documentos.");
      return;
    }
    const docItem = documents.find(d => d.id === id);
    if (!docItem) return;

    if (useLocalStorageMode) {
      const finalComment = comment.trim() || "Documento precisa de ajustes de formatação/conteúdo.";
      const updatedList = documents.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status: 'rejected' as const,
            note: finalComment
          };
        }
        return d;
      });
      saveDocumentsLocal(updatedList);
      await logAction(user, 'DOC_REJECT', `Recusou o documento local "${docItem.title}". Decisão: ${finalComment}.`);
      setNotification("Sucesso! O feedback e recusa foram registrados com sucesso localmente.");
      return;
    }

    try {
      const finalComment = comment.trim() || "Documento precisa de ajustes de formatação/conteúdo.";
      await updateDoc(doc(db, 'documents', id), {
        status: 'rejected',
        note: finalComment
      });
      await logAction(user, 'DOC_REJECT', `Recusou o documento "${docItem.title}". Decisão: ${finalComment}.`);

      setNotification("Sucesso! O feedback e parecer de recusa foram registrados com sucesso.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
      setNotification("Erro ao salvar recusa do documento.");
    }
  }, [documents, user, useLocalStorageMode]);

  const getExpirationAlert = useCallback((dateStr?: string) => {
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
  }, []);

  const handleDownload = useCallback((docItem: QualityDocument) => {
    if (!docItem.fileData) {
      setNotification("Este documento não possui dados para download.");
      return;
    }
    const link = document.createElement('a');
    link.href = docItem.fileData;
    link.download = docItem.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleOpen = useCallback((docItem: QualityDocument) => {
    if (!docItem.fileData) {
      setNotification("Este documento não possui dados para visualização.");
      return;
    }
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${docItem.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
      setNotification("O navegador bloqueou a abertura da nova janela. Por favor, permita pop-ups.");
    }
  }, []);

  useEffect(() => {
    (window as any).handleDownload = handleDownload;
    (window as any).handleOpen = handleOpen;
  }, [handleDownload, handleOpen]);

  return (
    <div className="min-h-screen bg-brand-light/40 text-slate-900 font-sans">
      {useLocalStorageMode && (
        <div className="bg-amber-500 text-white py-2.5 px-4 text-center text-[10px] font-black uppercase tracking-widest relative z-50 flex items-center justify-center gap-2 shadow-sm border-b border-amber-600">
          <i className="fas fa-exclamation-triangle animate-pulse text-white"></i>
          <span>Modo de Contingência Ativo: Operando de forma 100% autônoma e imediata com armazenamento local neste navegador.</span>
        </div>
      )}

      {notification && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-brand-primary text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 border-l-4 border-brand-secondary">
            <i className="fas fa-check-circle text-brand-secondary"></i>
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4 md:gap-10">
              <Logo />
              <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar py-2">
                <button 
                  onClick={() => setActiveTab('mural')}
                  className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'mural' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                >
                  {CONFIG.tabs.mural}
                </button>
                {user && (
                  <>
                    <button 
                      onClick={() => setActiveTab('public')}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'public' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      {CONFIG.tabs.public}
                    </button>
                  </>
                )}
                {user && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-200 mx-2 hidden md:block"></div>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'upload' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      {CONFIG.tabs.upload}
                    </button>
                  </>
                )}
                {user?.role === 'admin' && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-200 mx-2 hidden md:block"></div>
                    <button 
                      onClick={() => setActiveTab('review')}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap relative ${activeTab === 'review' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      Revisões
                      {documents.filter(d => d.status === 'pending').length > 0 && (
                        <span className="ml-1.5 bg-brand-secondary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                          {documents.filter(d => d.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  </>
                )}
                {(user?.email === 'qualidade@eclin.com.br' || user?.email === 'juliana.engbio@gmail.com') && (
                  <>
                    <div className="w-[1px] h-4 bg-slate-200 mx-2 hidden md:block"></div>
                    <button 
                      onClick={() => setActiveTab('reports')}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap relative ${activeTab === 'reports' ? 'text-brand-primary bg-brand-primary/5' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50'}`}
                    >
                      Relatórios
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
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none truncate max-w-[80px] sm:max-w-none">{user.name}</p>
                      {user.role === 'admin' && (
                        <span className="bg-brand-primary/10 text-brand-primary text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border border-brand-primary/20 flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-brand-secondary font-bold uppercase tracking-widest hidden sm:block">Equipe {CONFIG.brandName}</p>
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
              <div className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-4 border-brand-dark pb-6 gap-6">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary overflow-hidden border-2 border-brand-primary/20 shrink-0">
                      {!muralHeaderError ? (
                        <img 
                          src="https://lh3.googleusercontent.com/d/1jsycEnW0eYwgRkvhw6mfckuDVeBrpacT" 
                          alt="Selo Qualidade" 
                          className="w-10 h-10 sm:w-16 sm:h-16 object-contain"
                          onError={() => setMuralHeaderError(true)}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <i className="fas fa-award text-2xl sm:text-4xl"></i>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] sm:text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] sm:tracking-[0.4em] mb-1 sm:mb-2 block truncate">Mural da Qualidade</span>
                      <h2 className="text-4xl sm:text-6xl font-black text-blue-600 tracking-tighter uppercase leading-none break-words">Qualidade <br className="hidden sm:block"/>em Ação</h2>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleResetMural}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        title="Restaurar posts padrões do portal"
                      >
                        Restaurar Mural
                      </button>
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
                    </div>
                  )}
                </div>

                <MuralCarousel 
                  posts={muralPosts} 
                  onSelectPost={handleSelectPost} 
                  onEditPost={startEditingPost}
                  onDeletePost={handleDeletePost}
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
                            className="sr-only"
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
                      <button 
                        type="submit" 
                        disabled={isUploading}
                        className="w-full brand-gradient text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-50"
                      >
                        {editingPost ? 'Salvar Alterações' : 'Publicar no Mural'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'public' && user && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-brand-dark tracking-tight">Acervo {CONFIG.brandName}</h2>
                    <p className="text-sm text-slate-500 font-medium">Documentos validados.</p>
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
                  const areaDocs = filteredDocuments.filter(d => 
                    d.status === 'published' && 
                    d.area === area
                  );
                  if (areaDocs.length === 0) return null;
                  return (
                    <div key={area} className="space-y-4">
                      <h3 className="text-sm font-black text-brand-secondary uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-1 h-4 bg-brand-secondary rounded-full"></div>
                        {area}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {areaDocs.map(doc => (
                          <DocumentCard 
                            key={doc.id}
                            doc={doc}
                            user={user}
                            onEdit={handleEditDocument}
                            onDelete={handleDeleteDocument}
                            getExpirationAlert={getExpirationAlert}
                          />
                        ))}
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

                    <div className="text-center space-y-4">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
                          if (file) {
                            const lastDot = file.name.lastIndexOf('.');
                            const nameWithoutExt = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
                            setCustomDocTitle(nameWithoutExt);
                          } else {
                            setCustomDocTitle('');
                          }
                        }} 
                        className="sr-only" 
                        id="pdf-upload" 
                      />
                      {!selectedFile ? (
                        <label htmlFor="pdf-upload" className="inline-block px-10 py-4 brand-gradient text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all">
                          Selecionar PDF
                        </label>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-4 max-w-2xl mx-auto">
                          <h4 className="font-black text-xs text-brand-dark uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                            <i className="fas fa-info-circle text-brand-primary"></i> Informações do Documento
                          </h4>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Documento</label>
                            <input 
                              type="text"
                              value={customDocTitle}
                              onChange={(e) => setCustomDocTitle(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                              placeholder="Digite o título oficial"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento</label>
                              <select 
                                value={customDocType}
                                onChange={(e) => setCustomDocType(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                              >
                                <option value="Procedimento font-bold">Procedimento</option>
                                <option value="Procedimento">Procedimento</option>
                                <option value="Norma">Norma</option>
                                <option value="Manual">Manual</option>
                                <option value="Outro">Outro</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versão do Documento</label>
                              <input 
                                type="text"
                                value={customDocVersion}
                                onChange={(e) => setCustomDocVersion(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                                placeholder="Ex: 1.0"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Emissão (Data do Documento)</label>
                              <input 
                                type="date"
                                value={customEmissionDate}
                                onChange={(e) => setCustomEmissionDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                              <input 
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área Responsável</label>
                              <select 
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                              >
                                {CONFIG.areas.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-100 self-end h-[42px] overflow-hidden">
                              <i className="fas fa-file-pdf text-brand-primary shrink-0"></i>
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={selectedFile.name}>{selectedFile.name}</span>
                              <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500 ml-auto p-1">
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 text-center">
                            <button 
                              onClick={() => handleFileUpload('pdf')} 
                              disabled={isUploading}
                              className="w-full sm:w-auto px-10 py-4 brand-gradient text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                            >
                              {isUploading ? 'Enviando...' : 'Confirmar e Publicar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upload' && user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
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
                  <input type="file" accept=".doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="sr-only" id="docx-upload" />
                  {!selectedFile ? (
                    <label htmlFor="docx-upload" className="inline-block px-10 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/10">
                      Procurar Word (.doc / .docx)
                    </label>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm">
                        <i className="fas fa-file-word text-brand-primary"></i>
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[250px]">{selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500 ml-2">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <button 
                        onClick={() => handleFileUpload('docx')} 
                        disabled={isUploading}
                        className="px-10 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/10 disabled:opacity-50"
                      >
                        {isUploading ? 'Enviando...' : 'Enviar para Revisão'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Meus Envios para Revisão (Exclusivo Auto-Autoria) */}
                <div className="pt-6 border-t border-slate-100 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                      <i className="fas fa-history"></i>
                    </div>
                    <div>
                      <h3 className="font-black text-brand-dark text-sm uppercase tracking-tight">Meus Envios para Revisão</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Acompanhamento de status das suas submissões ONA</p>
                    </div>
                  </div>

                  {documents.filter(d => d.type === 'docx' && d.uploaderEmail === user.email).length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhum envio registrado</p>
                      <p className="text-[10px] text-slate-400 mt-1">Seus envios Word (.docx) sob análise serão mostrados aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents
                        .filter(d => d.type === 'docx' && d.uploaderEmail === user.email)
                        .map(myDoc => (
                          <div key={myDoc.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-brand-primary/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex items-start gap-3">
                              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0 mt-0.5">
                                <i className="fas fa-file-word text-base"></i>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 text-xs truncate max-w-[200px] sm:max-w-md" title={myDoc.title}>{myDoc.title}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Enviado em: {myDoc.uploadDate}</p>
                                
                                {myDoc.note && (
                                  <div className="mt-2 bg-white px-3 py-2 rounded-lg border border-slate-100 text-[10px] font-semibold text-slate-600">
                                    <span className="font-extrabold text-[8px] text-slate-400 uppercase tracking-wider block mb-0.5">Retorno da Qualidade:</span>
                                    {myDoc.note}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 shrink-0">
                              {myDoc.status === 'pending' && (
                                <span className="bg-amber-100 text-amber-700 font-black text-[9px] uppercase px-2.5 py-1 rounded-full tracking-wider">
                                  Pendente
                                </span>
                              )}
                              {myDoc.status === 'approved' && (
                                <div className="text-right">
                                  <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase px-2.5 py-1 rounded-full tracking-wider">
                                    Aprovado
                                  </span>
                                  <p className="text-[8px] font-extrabold text-emerald-600 block mt-1 uppercase tracking-wider max-w-[150px] leading-tight text-right">
                                    Fique atento que logo receberá o e-mail para assinatura do arquivo final!
                                  </p>
                                </div>
                              )}
                              {myDoc.status === 'rejected' && (
                                <div className="text-right">
                                  <span className="bg-rose-100 text-rose-800 font-black text-[9px] uppercase px-2.5 py-1 rounded-full tracking-wider">
                                    Ajuste Necessário
                                  </span>
                                  <p className="text-[8px] font-extrabold text-rose-500 block mt-1 uppercase tracking-wider">Verifique o retorno</p>
                                </div>
                              )}

                              {myDoc.fileData && (
                                <button 
                                  onClick={() => handleDownload(myDoc)}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200"
                                  title="Baixar arquivo enviado"
                                >
                                  <i className="fas fa-download text-xs"></i>
                                </button>
                              )}

                              <button 
                                onClick={() => handleDeleteDocument(myDoc.id)}
                                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-rose-500 hover:text-white text-red-500 flex items-center justify-center border border-red-100 transition-all shadow-sm"
                                title="Excluir submissão definitivamente"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'signed' && user && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 brand-gradient opacity-10 rounded-bl-full"></div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-brand-secondary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-secondary">
                    <i className="fas fa-certificate text-2xl"></i>
                  </div>
                  <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Cofre de Documentos ONA</h2>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {[...documents]
                    .filter(d => d.status === 'published' || d.status === 'signed')
                    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }))
                    .map(doc => (
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

            {activeTab === 'review' && user?.role === 'admin' && (() => {
              const reviewDocs = documents.filter(d => d.type === 'docx');
              const pendingCount = reviewDocs.filter(d => d.status === 'pending').length;
              const approvedCount = reviewDocs.filter(d => d.status === 'approved').length;
              const rejectedCount = reviewDocs.filter(d => d.status === 'rejected').length;

              const filteredReviewDocs = reviewDocs.filter(d => {
                if (reviewStatusFilter === 'pending') return d.status === 'pending';
                if (reviewStatusFilter === 'approved') return d.status === 'approved';
                if (reviewStatusFilter === 'rejected') return d.status === 'rejected';
                return true;
              });

              return (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden font-sans">
                  <div className="absolute top-0 right-0 w-32 h-32 brand-gradient opacity-10 rounded-bl-full"></div>
                  <div className="flex items-center justify-between relative z-10 flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-5">
                      <div className="bg-brand-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-primary">
                        <i className="fas fa-clipboard-list text-2xl"></i>
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Painel de Revisão ONA</h2>
                        <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest mt-1">Homologação de novos documentos submetidos</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs font-medium leading-relaxed flex gap-4 relative z-10">
                    <i className="fas fa-info-circle text-brand-secondary text-base self-start mt-0.5 animate-pulse"></i>
                    <p>Aqui você pode gerenciar todas as submissões de documentos Word (.docx) feitas pelos colaboradores. O histórico é preservado de forma independente no banco de dados. Você poderá deliberar com um parecer e comunicar automaticamente o remetente por e-mail!</p>
                  </div>

                  {/* Filtros rápidos no Painel */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 relative z-10">
                    <button 
                      onClick={() => setReviewStatusFilter('all')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${reviewStatusFilter === 'all' ? 'bg-brand-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Todos ({reviewDocs.length})
                    </button>
                    <button 
                      onClick={() => setReviewStatusFilter('pending')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${reviewStatusFilter === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${reviewStatusFilter === 'pending' ? 'bg-white' : 'bg-amber-400'}`}></span>
                      Pendentes ({pendingCount})
                    </button>
                    <button 
                      onClick={() => setReviewStatusFilter('approved')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${reviewStatusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${reviewStatusFilter === 'approved' ? 'bg-white' : 'bg-emerald-400'}`}></span>
                      Aprovados ({approvedCount})
                    </button>
                    <button 
                      onClick={() => setReviewStatusFilter('rejected')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${reviewStatusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${reviewStatusFilter === 'rejected' ? 'bg-white' : 'bg-rose-400'}`}></span>
                      Recusados ({rejectedCount})
                    </button>
                  </div>

                  <div className="space-y-6 relative z-10">
                    {filteredReviewDocs.length === 0 ? (
                      <div className="text-center py-16 px-4 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                        <div className="w-14 h-14 bg-slate-100 text-slate-400 flex items-center justify-center rounded-2xl mx-auto mb-4 text-xl">
                          <i className="fas fa-folder-open"></i>
                        </div>
                        <p className="font-black text-slate-800 text-sm leading-none uppercase tracking-wider">Nenhum documento encontrado</p>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Nenhuma submissão de arquivo coincide com o filtro selecionado.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filteredReviewDocs.map(docItem => (
                          <PendingReviewCard 
                            key={docItem.id} 
                            docItem={docItem}
                            onApprove={handleApproveDocument}
                            onDecline={handleDeclineDocument}
                            onDownload={handleDownload}
                            onDelete={handleDeleteDocument}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === 'reports' && (user?.email === 'qualidade@eclin.com.br' || user?.email === 'juliana.engbio@gmail.com') && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 w-32 h-32 brand-gradient opacity-10 rounded-bl-full"></div>
                <div className="flex items-center justify-between relative z-10 flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-5">
                    <div className="bg-brand-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-brand-primary">
                      <i className="fas fa-file-invoice text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Relatórios e Controles</h2>
                      <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest mt-1 font-sans">Gestão da Qualidade e Lista Mestra de Documentos</p>
                    </div>
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total no Acervo</div>
                    <div className="text-3xl font-black text-brand-dark mt-2">
                      {documents.filter(d => d.status === 'published' || d.status === 'signed' || d.status === 'approved').length}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aguardando Revisão</div>
                    <div className="text-3xl font-black text-brand-secondary mt-2">
                      {documents.filter(d => d.status === 'pending').length}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Versão Mais Alta</div>
                    <div className="text-3xl font-black text-brand-primary mt-2">
                      v{documents.reduce((acc, current) => {
                        const vNum = parseFloat(current.version || '1.0');
                        return vNum > acc ? vNum : acc;
                      }, 1.0).toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
                  <div className="space-y-1 text-left">
                    <h3 className="font-black text-slate-800 text-sm leading-none uppercase tracking-wider font-sans">Exportar Lista Mestra Oficial</h3>
                    <p className="text-xs text-slate-500 font-medium font-sans">Gere uma planilha Excel (.csv) com todos os documentos validados na ONA.</p>
                  </div>
                  <button
                    onClick={downloadListaMestra}
                    className="w-full md:w-auto px-8 py-3.5 brand-gradient text-white font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-primary/25 whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-file-excel text-base"></i> Baixar Lista Mestra Atualizada
                  </button>
                </div>

                {/* Table of active documents */}
                <div className="space-y-4">
                  <h3 className="font-black text-[10px] text-slate-400 text-left uppercase tracking-widest ml-1">Visualização da Lista Mestra</h3>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Área</th>
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Versão</th>
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Emissão</th>
                          <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Validade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {documents.filter(d => d.status === 'published' || d.status === 'signed' || d.status === 'approved').map(doc => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-xs font-black text-slate-800 leading-none">{doc.title}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-[8px] font-black text-slate-600 rounded uppercase tracking-wider font-sans">
                                {doc.area}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-600 font-sans">
                                {doc.docType || 'Procedimento'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-brand-primary/10 text-[9px] font-black text-brand-primary rounded">
                                v{doc.version || '1.0'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              <span className="text-xs font-medium text-slate-500">
                                {doc.emissionDate || doc.uploadDate}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              <span className="text-xs font-medium text-slate-500">
                                {doc.expirationDate || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {documents.filter(d => d.status === 'published' || d.status === 'signed' || d.status === 'approved').length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                              Nenhum documento ativo no acervo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Log de Histórico e Auditoria */}
                <div className="space-y-4 pt-8 border-t border-slate-100 font-sans">
                  <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2 self-start sm:self-center">
                      <i className="fas fa-history text-brand-primary"></i> Log de Histórico e Auditoria Geral
                    </h3>
                    <span className="text-[9px] px-2.5 py-1 bg-brand-primary/10 text-brand-primary rounded-full font-black uppercase tracking-wider self-start sm:self-center">
                      🔐 Registro Imutável em Nuvem (Firestore)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider text-left">
                    Histórico cronológico de atividades críticas (Inclusões, Exclusões, Homologações, Alterações de Metas e Eventos de Restauração).
                  </p>
                  
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-6 max-h-[360px] overflow-y-auto space-y-4 no-scrollbar">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        Nenhuma atividade registrada no log de auditoria até o momento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs.map((log) => {
                          const dateObj = new Date(log.timestamp);
                          const dateStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleString('pt-BR');
                          
                          let badgeStyle = "bg-slate-200 text-slate-700";
                          if (log.action?.includes("DELETE") || log.action?.includes("REJECT")) {
                            badgeStyle = "bg-rose-100 text-rose-700 border border-rose-200";
                          } else if (log.action?.includes("CREATE") || log.action?.includes("APPROVE") || log.action?.includes("UPLOAD")) {
                            badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                          } else if (log.action?.includes("RESTORE") || log.action?.includes("RESET")) {
                            badgeStyle = "bg-amber-100 text-amber-700 border border-amber-200";
                          } else if (log.action?.includes("EDIT") || log.action?.includes("UPDATE")) {
                            badgeStyle = "bg-blue-100 text-blue-700 border border-blue-200";
                          }

                          return (
                            <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-3 group">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                                    {log.action}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                    {log.userName}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                                    &lt;{log.userEmail}&gt;
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-600 leading-relaxed font-sans">{log.details}</p>
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap self-start md:self-center font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 group-hover:bg-slate-100 transition-colors">
                                {dateStr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Countdown 
              isAdmin={user?.role === 'admin'} 
              user={user}
              useLocalStorageMode={useLocalStorageMode}
              onLogAction={(action, details) => logAction(user, action, details)}
            />

            {!user && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-brand-dark flex items-center gap-3 uppercase tracking-tighter">
                  <div className="w-1.5 h-5 bg-brand-secondary rounded-full"></div>
                  Acesso Interno
                </h3>
                
                {loginStep === 'email' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                      Identifique-se com o seu e-mail corporativo:
                    </p>
                    <div>
                      <input 
                        type="email"
                        name="email"
                        autoComplete="username email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-mail Corporativo"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                        required
                        disabled={isAuthLoading}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isAuthLoading}
                      className="w-full brand-gradient text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                    >
                      {isAuthLoading ? 'Verificando...' : 'Prosseguir'}
                    </button>
                  </form>
                )}

                {loginStep === 'password' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-xs font-black text-brand-dark truncate leading-tight">
                      Olá, <span className="text-brand-primary font-black">{tempUserDoc?.firstName}</span>!
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Digite sua senha de 6 dígitos numéricos:
                    </p>
                    {/* Hidden email to anchor credentials managers */}
                    <input 
                      type="email" 
                      name="email" 
                      value={email} 
                      readOnly 
                      className="sr-only" 
                      autoComplete="username" 
                    />
                    <div>
                      <input 
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha de 6 dígitos"
                        maxLength={6}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                        required
                        disabled={isAuthLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setPassword('');
                          setTempUserDoc(null);
                        }}
                        className="w-1/3 bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all text-center"
                      >
                        Voltar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isAuthLoading}
                        className="w-2/3 brand-gradient text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20"
                      >
                        Entrar
                      </button>
                    </div>

                    <div className="text-center pt-2 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFirstName(tempUserDoc?.firstName || '');
                          setLastName(tempUserDoc?.lastName || '');
                          setRegAreaBase(tempUserDoc?.areaBase || CONFIG.areas[0]);
                          setRegPassword('');
                          setRegConfirmPassword('');
                          setLoginStep('register');
                          setNotification("Modo de redefinição de acesso! Altere o seu cadastro ou digite sua nova senha abaixo.");
                        }}
                        className="text-[9px] font-black text-slate-400 hover:text-brand-primary uppercase tracking-widest transition-colors"
                      >
                        Esqueci minha senha / Redefinir Cadastro
                      </button>
                    </div>
                  </form>
                )}

                {loginStep === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Hidden email to anchor credentials managers and avoid mismatch on Name/Last Name */}
                    <input 
                      type="email" 
                      name="email" 
                      value={email} 
                      readOnly 
                      className="sr-only" 
                      autoComplete="username email" 
                    />
                    
                    <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
                      <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider mb-1">
                        PRIMEIRO ACESSO DETECTADO!
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Cadastre seu perfil corporativo para continuar.
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      E-mail: <span className="text-slate-600 font-black normal-case">{email}</span>
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome</label>
                        <input 
                          type="text"
                          name="firstname"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ex: Juliana"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sobrenome</label>
                        <input 
                          type="text"
                          name="lastname"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Ex: Bertoni"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Área / Base de Atuação</label>
                      <select 
                        value={regAreaBase}
                        onChange={(e) => setRegAreaBase(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                        required
                      >
                        {CONFIG.areas.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Senha (6 dígitos)</label>
                        <input 
                          type="password"
                          name="new-password"
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Senha de 6 dígitos"
                          maxLength={6}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Confirmar Senha</label>
                        <input 
                          type="password"
                          name="confirm-password"
                          autoComplete="new-password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          maxLength={6}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-xs font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setFirstName('');
                          setLastName('');
                          setRegPassword('');
                          setRegConfirmPassword('');
                        }}
                        className="w-1/3 bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all text-center whitespace-nowrap"
                      >
                        Voltar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isAuthLoading}
                        className="w-2/3 brand-gradient text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20"
                      >
                        {isAuthLoading ? 'Salvando...' : 'Cadastrar'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                    Está com lentidão ou erro de cota no banco Firebase?
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Ative o modo de contingência local para desviar de problemas de conexão e acessar / usar o portal de imediato.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !useLocalStorageMode;
                      localStorage.setItem('eclin_contingency_mode', nextMode.toString());
                      setUseLocalStorageMode(nextMode);
                      setNotification(nextMode 
                        ? "Portal chaveado para operação local em contingência! Recarregando..." 
                        : "Modo de sincronização com o banco reativado! Recarregando..."
                      );
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    }}
                    className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border ${
                      useLocalStorageMode 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <i className={`fas ${useLocalStorageMode ? 'fa-check' : 'fa-exclamation-triangle'} animate-pulse`}></i>
                    {useLocalStorageMode ? 'DESATIVAR TENDO ACESSO AO BANCO' : 'ATIVAR MODO DE CONTINGÊNCIA LOCAL'}
                  </button>
                </div>
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
                <span>Para suporte envie e-mail para qualidade@eclin.com.br</span>
              </div>
            </div>
          </div>
        </div>
      </footer>



      {/* Modal de Detalhes do Post */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          ></div>
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col">
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

      {/* Modal de Edição de Informações do Documento */}
      {isEditingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
          <div 
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            onClick={() => {
              setIsEditingDoc(false);
              setEditingDocId(null);
            }}
          ></div>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col p-10 max-h-[90vh]">
            <button 
              onClick={() => {
                setIsEditingDoc(false);
                setEditingDocId(null);
              }}
              className="absolute top-6 right-6 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-all z-20"
            >
              <i className="fas fa-times text-md"></i>
            </button>
            
            <div className="flex items-center gap-5 mb-8 text-left">
              <div className="bg-brand-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-brand-primary">
                <i className="fas fa-edit text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight leading-none">Editar Dados do Documento</h3>
                <p className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest mt-1.5">Ajuste os parâmetros oficiais ONA</p>
              </div>
            </div>

            <form onSubmit={handleSaveDocEdit} className="space-y-6 overflow-y-auto pr-2 no-scrollbar text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Documento</label>
                <input 
                  type="text"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Documento</label>
                  <select 
                    value={editDocType}
                    onChange={(e) => setEditDocType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                  >
                    <option value="Procedimento">Procedimento</option>
                    <option value="Norma">Norma</option>
                    <option value="Manual">Manual</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versão do Documento</label>
                  <input 
                    type="text"
                    value={editDocVersion}
                    onChange={(e) => setEditDocVersion(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                    placeholder="Ex: 1.0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Emissão (Data do Documento)</label>
                  <input 
                    type="date"
                    value={editDocEmissionDate}
                    onChange={(e) => setEditDocEmissionDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Validade</label>
                  <input 
                    type="date"
                    value={editDocExpirationDate}
                    onChange={(e) => setEditDocExpirationDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área Responsável</label>
                <select 
                  value={editDocArea}
                  onChange={(e) => setEditDocArea(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-primary outline-none"
                >
                  {CONFIG.areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditingDoc(false);
                    setEditingDocId(null);
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 brand-gradient text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 font-sans"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
