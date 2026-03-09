
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Building2, Plus, Loader2, Download, Printer, Share2, 
  Map as MapIcon, ImageIcon, CheckCircle2,
  Trash2, X, ChevronRight, Globe, Info, History, ArrowLeft, Clock,
  LogIn, User as UserIcon, LogOut, ThumbsUp, ThumbsDown, UserPlus, ShieldAlert, 
  Layers, Star, MessageSquare, Send
} from 'lucide-react';
import { ProjectState, AnalysisResult, ProjectType, ArchitecturalStyle, SavedProject, User, UserRole, ProjectScale, Comment } from './types';
import { PROJECT_TYPES, ARCH_STYLES, PROJECT_SCALES } from './constants';
import MapPicker from './components/MapPicker';
import AnalysisDashboard from './components/AnalysisDashboard';
import { analyzeProject, generateVisualization } from './services/apiService';
import { fetchProjects as fetchProjectsFromDb, saveProject as saveProjectToDb, deleteProject as deleteProjectFromDb, supabase } from './services/supabase';

const LOADING_MESSAGES = [
  "Сверяем проект с генпланом Уральска...",
  "Оцениваем нагрузку на инфраструктуру...",
  "Генерируем архитектурную визуализацию...",
  "Проводим экологическую экспертизу...",
  "Рассчитываем социальный эффект..."
];

type ViewState = 'AUTH' | 'FORM' | 'RESULT' | 'HISTORY';
type AuthMode = 'LOGIN' | 'REGISTER';

const ADMIN_CREDENTIALS = {
  iin: '000000000001',
  password: 'admin123'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  
  // Form states
  const [iin, setIin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [project, setProject] = useState<ProjectState>({
    name: '',
    type: ProjectType.RESIDENTIAL,
    scale: ProjectScale.DISTRICT,
    description: '',
    dimensions: '',
    style: ArchitecturalStyle.MODERN,
    location: null,
    base64Image: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<SavedProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const MAX_LOCAL_ITEMS = 10;
  const toLightProject = (p: SavedProject): SavedProject => ({
    ...p,
    project: { ...p.project, base64Image: null },
    result: { ...p.result, generatedImageUrl: null },
  });
  const toLightHistory = (list: SavedProject[]) =>
    list.slice(0, MAX_LOCAL_ITEMS).map(toLightProject);

  useEffect(() => {
    // Load data
    try {
      const deletedRaw = localStorage.getItem('uralsk_deleted_ids');
      if (deletedRaw) {
        const parsed: unknown = JSON.parse(deletedRaw);
        if (Array.isArray(parsed)) setDeletedIds(parsed as string[]);
      }
    } catch {}
    const savedHistory = localStorage.getItem('uralsk_project_history_v4');
    if (savedHistory) {
      try { 
        const parsed = JSON.parse(savedHistory);
        // Migrate old data if necessary
        const migrated = parsed.map((p: any) => ({
          ...p,
          ratings: p.ratings || {},
          comments: p.comments || []
        }));
        const cleaned = migrated.map((p: any) => ({
          ...p,
          project: { ...p.project, base64Image: null },
          result: { ...p.result, generatedImageUrl: null }
        }));
        setHistory(cleaned); 
      } catch (e) { console.error(e); }
    }
    const session = localStorage.getItem('uralsk_user_session');
    if (session) {
      setUser(JSON.parse(session));
      setView('HISTORY');
    }
    // Also try to fetch from Supabase if configured
    (async () => {
      try {
        if (supabase) {
          const remote = await fetchProjectsFromDb();
          if (remote.length > 0) {
            const deletedSet = new Set(
              (() => { try { return JSON.parse(localStorage.getItem('uralsk_deleted_ids') || '[]'); } catch { return []; } })()
            );
            const filteredRemote = remote.filter(r => !deletedSet.has(r.id));
            setHistory(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const merged = [...prev, ...filteredRemote.filter(r => !existingIds.has(r.id))];
              return merged.sort((a, b) => b.timestamp - a.timestamp);
            });
          }
        }
      } catch (e) {
        console.warn('Loading from Supabase failed', e);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('uralsk_project_history_v4', JSON.stringify(toLightHistory(history)));
    } catch {
      try {
        const smaller = toLightHistory(history.slice(0, Math.min(history.length, MAX_LOCAL_ITEMS)));
        localStorage.setItem('uralsk_project_history_v4', JSON.stringify(smaller));
      } catch {
        try {
          localStorage.removeItem('uralsk_project_history_v4');
        } catch {}
      }
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('uralsk_deleted_ids', JSON.stringify(deletedIds));
    } catch {}
  }, [deletedIds]);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (iin.length !== 12) { setError("ИИН должен содержать 12 цифр"); return; }
    if (password !== confirmPassword) { setError("Пароли не совпадают"); return; }
    
    const users = JSON.parse(localStorage.getItem('uralsk_users') || '[]');
    if (users.find((u: any) => u.iin === iin)) {
      setError("Пользователь с таким ИИН уже зарегистрирован");
      return;
    }

    const newUser = { iin, password, name: fullName, role: UserRole.CITIZEN };
    users.push(newUser);
    localStorage.setItem('uralsk_users', JSON.stringify(users));
    
    setAuthMode('LOGIN');
    setError(null);
    alert("Регистрация успешна! Теперь войдите в систему.");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check Admin first
    if (iin === ADMIN_CREDENTIALS.iin && password === ADMIN_CREDENTIALS.password) {
      const adminUser: User = { iin, name: "Главный Архитектор", role: UserRole.ADMIN };
      setUser(adminUser);
      localStorage.setItem('uralsk_user_session', JSON.stringify(adminUser));
      setView('HISTORY');
      return;
    }

    // Check local users
    const users = JSON.parse(localStorage.getItem('uralsk_users') || '[]');
    const foundUser = users.find((u: any) => u.iin === iin && u.password === password);

    if (foundUser) {
      const userData: User = { iin: foundUser.iin, name: foundUser.name, role: foundUser.role };
      setUser(userData);
      localStorage.setItem('uralsk_user_session', JSON.stringify(userData));
      setView('HISTORY');
    } else {
      setError("Неверный ИИН или пароль");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('uralsk_user_session');
    setView('AUTH');
    setIin('');
    setPassword('');
    setFullName('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProject(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = useCallback((latlng: [number, number]) => {
    setProject(prev => ({ ...prev, location: latlng }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProject(prev => ({ ...prev, base64Image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.location || !project.base64Image || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const [metrics, visUrl] = await Promise.all([
        analyzeProject(project),
        generateVisualization(project)
      ]);
      
      const result: AnalysisResult = { metrics, generatedImageUrl: visUrl };
      setCurrentResult(result);
      
      const newSavedProject: SavedProject = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        creatorIin: user.iin,
        project: { ...project },
        result: result,
        votesFor: [],
        votesAgainst: [],
        ratings: {},
        comments: []
      };
      setHistory(prev => [newSavedProject, ...prev]);
      // Persist to Supabase if available (best effort)
      saveProjectToDb(newSavedProject).catch((e) => console.warn('Save to Supabase failed', e));
      setActiveProjectId(newSavedProject.id);
      setView('RESULT');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = (projectId: string, type: 'FOR' | 'AGAINST') => {
    if (!user || user.role !== UserRole.CITIZEN) return;
    
    setHistory(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const alreadyVotedFor = p.votesFor.includes(user.iin);
      const alreadyVotedAgainst = p.votesAgainst.includes(user.iin);
      
      if (type === 'FOR') {
        if (alreadyVotedFor) return { ...p, votesFor: p.votesFor.filter(i => i !== user.iin) };
        return { ...p, votesFor: [...p.votesFor, user.iin], votesAgainst: p.votesAgainst.filter(i => i !== user.iin) };
      } else {
        if (alreadyVotedAgainst) return { ...p, votesAgainst: p.votesAgainst.filter(i => i !== user.iin) };
        return { ...p, votesAgainst: [...p.votesAgainst, user.iin], votesFor: p.votesFor.filter(i => i !== user.iin) };
      }
    }));
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!user || user.role !== UserRole.ADMIN) return;
    if (!window.confirm('Удалить проект? Это действие необратимо.')) return;
    setHistory(prev => prev.filter(p => p.id !== projectId));
    setDeletedIds(prev => prev.includes(projectId) ? prev : [...prev, projectId]);
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setCurrentResult(null);
      setView('HISTORY');
    }
    deleteProjectFromDb(projectId).catch(err => console.warn('Delete from Supabase failed', err));
  };

  const handleRate = (projectId: string, rating: number) => {
    if (!user || user.role !== UserRole.CITIZEN) return;
    setHistory(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        ratings: {
          ...p.ratings,
          [user.iin]: rating
        }
      };
    }));
  };

  const handleAddComment = (projectId: string) => {
    if (!user || !commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      authorIin: user.iin,
      authorName: user.name,
      text: commentText.trim(),
      timestamp: Date.now()
    };
    setHistory(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        comments: [...p.comments, newComment]
      };
    }));
    setCommentText('');
  };

  const activeProject = history.find(p => p.id === activeProjectId);
  // Fix: Explicitly cast ratings values to number[] to resolve '+' operator errors on unknown types
  const avgRating = activeProject ? 
    Object.values(activeProject.ratings).length > 0 ? 
      ((Object.values(activeProject.ratings) as number[]).reduce((a, b) => a + b, 0) / Object.values(activeProject.ratings).length).toFixed(1) : 
      '0.0' : 
    '0.0';

  if (view === 'AUTH') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building2 className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Visionary Uralsk</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              {authMode === 'LOGIN' ? 'С возвращением в систему' : 'Регистрация нового пользователя'}
            </p>
          </div>

          <form onSubmit={authMode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-5">
            {authMode === 'REGISTER' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">ФИО</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">ИИН (12 цифр)</label>
              <input
                type="text"
                maxLength={12}
                required
                value={iin}
                onChange={(e) => setIin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono tracking-widest font-bold"
                placeholder="000000000000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
            {authMode === 'REGISTER' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Подтвердите пароль</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-in shake duration-300">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <button className="w-full py-4.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 mt-4">
              {authMode === 'LOGIN' ? <LogIn size={20} /> : <UserPlus size={20} />}
              {authMode === 'LOGIN' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <button 
              onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(null); }}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              {authMode === 'LOGIN' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('HISTORY')}>
          <div className="bg-blue-600 p-2 rounded-xl shadow-md">
            <Building2 className="text-white" size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900 leading-none">Visionary Uralsk</h1>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Цифровой Уральск</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
              {user?.name.charAt(0)}
            </div>
            <div className="text-left leading-none">
              <div className="text-[10px] font-bold text-slate-400 uppercase">{user?.role === UserRole.ADMIN ? 'Акимат' : 'Житель'}</div>
              <div className="text-xs font-black text-slate-700">{user?.name}</div>
            </div>
          </div>
          
          <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {view === 'HISTORY' ? 'Все проекты города' : view === 'FORM' ? 'Создание проекта' : 'Результат анализа'}
            </h2>
            <p className="text-slate-500 font-medium">
              {view === 'HISTORY' ? 'Изучайте и голосуйте за будущее Уральска' : 'Интеллектуальная оценка городского пространства'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {view !== 'HISTORY' && view !== 'AUTH' && (
              <button
                onClick={() => setView('HISTORY')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                type="button"
              >
                <ArrowLeft size={18} />
                Назад
              </button>
            )}
            {user?.role === UserRole.ADMIN && view !== 'FORM' && (
              <button 
                onClick={() => { setProject({...project, location: null, base64Image: null, name: ''}); setView('FORM'); }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                type="button"
              >
                <Plus size={20} />
                Предложить проект
              </button>
            )}
          </div>
        </div>

        {view === 'FORM' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-5">
              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Название проекта</label>
                    <input required name="name" value={project.name} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold" placeholder="Введите название..." />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Тип здания</label>
                      <select name="type" value={project.type} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Масштаб проекта</label>
                      <select name="scale" value={project.scale} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                        {PROJECT_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Архит. стиль</label>
                      <select name="style" value={project.style} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                        {ARCH_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Параметры</label>
                      <input name="dimensions" value={project.dimensions} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none font-bold" placeholder="Площадь, этажность..." />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Описание и концепция</label>
                    <textarea required name="description" value={project.description} onChange={handleInputChange} className="w-full px-5 py-4 bg-slate-50 rounded-2xl h-32 border-none font-medium resize-none" placeholder="Расскажите о пользе проекта для Уральска..." />
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center cursor-pointer transition-all ${project.base64Image ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    {project.base64Image ? (
                      <div className="relative w-full">
                        <img src={project.base64Image} className="w-full h-32 object-cover rounded-xl" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                          <span className="text-white font-bold text-xs">Заменить фото</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={32} className="text-slate-300 mb-2"/>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Загрузить фото площадки</span>
                      </>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                </div>
                
                <div className="flex gap-4">
                   <button 
                    type="button"
                    onClick={() => setView('HISTORY')}
                    className="flex-1 py-5 bg-slate-100 text-slate-700 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all"
                  >
                    Назад
                  </button>
                  <button disabled={isLoading} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-95">
                    {isLoading ? <><Loader2 className="animate-spin" /> {LOADING_MESSAGES[loadingMsgIndex]}</> : "Запустить AI экспертизу"}
                  </button>
                </div>
              </form>
            </div>
            <div className="lg:col-span-7">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 h-full flex flex-col">
                <h3 className="font-black mb-4 flex items-center gap-2"><MapIcon className="text-blue-600" /> Выберите локацию на карте</h3>
                <div className="flex-1 rounded-2xl overflow-hidden border min-h-[400px]">
                  <MapPicker location={project.location} onLocationSelect={handleLocationSelect} />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'HISTORY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {history.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-300">
                <History className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-bold">Проектов пока нет. Будьте первыми!</p>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col h-full" onClick={() => { setProject(item.project); setCurrentResult(item.result); setActiveProjectId(item.id); setView('RESULT'); }}>
                  <div className="aspect-video relative overflow-hidden bg-slate-100">
                    <img src={item.result.generatedImageUrl || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-600 shadow-sm">{item.project.type}</div>
                      <div className="bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm">{item.project.scale.split(' ')[0]}</div>
                    </div>
                    {user?.role === UserRole.ADMIN && (
                      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDeleteProject(e, item.id)}
                          className="px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 hover:border-rose-200 shadow-sm flex items-center gap-1"
                          title="Удалить проект"
                          type="button"
                        >
                          <Trash2 size={14} /> Удалить
                        </button>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black">
                        {/* Fix: Explicitly cast ratings values to number[] to resolve '+' operator errors on unknown types */}
                        {Object.values(item.ratings).length > 0 ? 
                          ((Object.values(item.ratings) as number[]).reduce((a, b) => a + b, 0) / Object.values(item.ratings).length).toFixed(1) : 
                          '0.0'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 mb-1">{item.project.name}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-4 font-medium">{item.project.description}</p>
                    
                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                        <span>Поддержка жителей</span>
                        <span className="text-slate-900">{Math.round((item.votesFor.length / (item.votesFor.length + item.votesAgainst.length || 1)) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(item.votesFor.length / (item.votesFor.length + item.votesAgainst.length || 1)) * 100}%` }}></div>
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${(item.votesAgainst.length / (item.votesFor.length + item.votesAgainst.length || 1)) * 100}%` }}></div>
                      </div>

                      <div className="flex gap-2 no-print" onClick={(e) => e.stopPropagation()}>
                        <button 
                          disabled={user?.role !== UserRole.CITIZEN}
                          onClick={() => handleVote(item.id, 'FOR')}
                          className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-xs ${item.votesFor.includes(user?.iin || '') ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'border-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          <ThumbsUp size={14} /> {item.votesFor.length}
                        </button>
                        <button 
                          disabled={user?.role !== UserRole.CITIZEN}
                          onClick={() => handleVote(item.id, 'AGAINST')}
                          className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-xs ${item.votesAgainst.includes(user?.iin || '') ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100' : 'border-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'}`}
                        >
                          <ThumbsDown size={14} /> {item.votesAgainst.length}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'RESULT' && currentResult && activeProjectId && (
          <div className="animate-in slide-in-from-bottom-6 duration-700">
            <button onClick={() => setView('HISTORY')} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-6 transition-colors no-print group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Назад к списку
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <AnalysisDashboard metrics={currentResult.metrics} imageUrl={currentResult.generatedImageUrl} projectName={project.name} />
              </div>
              
              {/* Sidebar: Ratings & Comments */}
              <div className="lg:col-span-4 space-y-8">
                {/* Rating Section */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800">Рейтинг проекта</h3>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-xl font-black text-lg">
                      {avgRating}
                    </div>
                  </div>
                  
                  {user?.role === UserRole.CITIZEN ? (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-400 uppercase">Ваша оценка:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                          <button 
                            key={star} 
                            onClick={() => handleRate(activeProjectId, star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star 
                              size={24} 
                              className={star <= (activeProject?.ratings[user.iin] || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'} 
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-center text-[10px] font-bold text-slate-400">Нажмите на звезду, чтобы проголосовать</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Оценивать проекты могут только жители города.</p>
                  )}
                </div>

                {/* Comments Section */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-[600px]">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <MessageSquare size={20} className="text-blue-600" />
                    Отзывы жителей ({activeProject?.comments.length || 0})
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                    {activeProject?.comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <MessageSquare size={48} className="mb-2 opacity-20" />
                        <p className="text-sm font-bold">Пока нет комментариев</p>
                      </div>
                    ) : (
                      activeProject?.comments.map(c => (
                        <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-right-2">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-black text-slate-900">{c.authorName}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {user?.role === UserRole.CITIZEN && (
                    <div className="mt-auto">
                      <div className="relative">
                        <textarea 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Напишите ваш отзыв..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                          rows={3}
                        />
                        <button 
                          onClick={() => handleAddComment(activeProjectId)}
                          disabled={!commentText.trim()}
                          className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;
