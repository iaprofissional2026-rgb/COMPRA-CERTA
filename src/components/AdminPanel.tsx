import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore';
import { 
  Users, 
  Key, 
  ClipboardList, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ChevronRight,
  UserCheck,
  UserMinus,
  Calendar,
  Bell,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Smartphone,
  Save,
  Loader2
} from 'lucide-react';
import { NotificationService } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdminPanel() {
  const { appSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'codes' | 'users' | 'notifications' | 'settings'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newCode, setNewCode] = useState({ code: '', maxUses: 1 });
  const [broadcast, setBroadcast] = useState({ title: '', body: '' });
  const [isSending, setIsSending] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [localSettings, setLocalSettings] = useState({
    appName: '',
    appDescription: '',
    appVersion: '',
    playStoreUrl: '',
    openRouterApiKey: ''
  });

  useEffect(() => {
    if (appSettings) {
      setLocalSettings(prev => ({
        ...prev,
        appName: appSettings.appName || '',
        appDescription: appSettings.appDescription || '',
        appVersion: appSettings.appVersion || '',
        playStoreUrl: appSettings.playStoreUrl || ''
      }));
    }
  }, [appSettings]);

  useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'app_settings', 'secrets'));
        if (docSnap.exists()) {
          setLocalSettings(prev => ({
            ...prev,
            openRouterApiKey: docSnap.data().openRouterApiKey || ''
          }));
        }
      } catch (e) {
        console.error('Error fetching secrets:', e);
      }
    };
    fetchSecrets();
  }, []);
  useEffect(() => {
    const unsubRequests = onSnapshot(query(collection(db, 'users'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCodes = onSnapshot(query(collection(db, 'access_codes'), orderBy('expiresAt', 'desc')), (snap) => {
      setCodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubRequests();
      unsubCodes();
      unsubUsers();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveRequest = async (user: any) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { 
        status: 'approved',
        isActive: true 
      });
      showToast('Usuário aprovado!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'new' });
      showToast('Solicitação rejeitada.');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.code || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'access_codes'), {
        code: newCode.code.toUpperCase(),
        maxUses: newCode.maxUses,
        currentUses: 0,
        isUsed: false,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewCode({ code: '', maxUses: 1 });
      showToast('Código criado com sucesso!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'access_codes');
    }
  };

  const toggleUserStatus = async (userId: string, isApproved: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        status: isApproved ? 'new' : 'approved',
        isActive: !isApproved 
      });
      showToast(isApproved ? 'Acesso revogado' : 'Acesso liberado');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este código?')) return;
    try {
      await deleteDoc(doc(db, 'access_codes', codeId));
      showToast('Código excluído!');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'access_codes');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      showToast('Usuário excluído!');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'users');
    }
  };

  const improveDescription = async () => {
    if (!localSettings.appDescription || !localSettings.openRouterApiKey) {
      showToast('Adicione uma descrição e a chave da OpenRouter primeiro.', 'error');
      return;
    }
    setIsImproving(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localSettings.openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em marketing de aplicativos. Melhore a descrição fornecida para torná-la mais atraente e profissional, mantendo o mesmo idioma. Retorne apenas a descrição melhorada, sem aspas ou comentários adicionais.'
            },
            {
              role: 'user',
              content: localSettings.appDescription
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com a OpenRouter');
      }

      const data = await response.json();
      const improvedText = data.choices[0]?.message?.content?.trim();
      
      if (improvedText) {
        setLocalSettings(prev => ({ ...prev, appDescription: improvedText }));
        showToast('Descrição melhorada com sucesso!');
      } else {
        throw new Error('Resposta vazia');
      }
    } catch (error) {
      console.error('Error improving description:', error);
      showToast('Erro ao melhorar descrição. Verifique sua chave API.', 'error');
    } finally {
      setIsImproving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { openRouterApiKey, ...publicSettings } = localSettings;
      
      await updateDoc(doc(db, 'app_settings', 'global'), {
        ...publicSettings,
        updatedAt: serverTimestamp()
      });

      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'app_settings', 'secrets'), {
        openRouterApiKey,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('Configurações salvas!');
    } catch (e) {
      // If document doesn't exist, create it
      try {
        const { openRouterApiKey, ...publicSettings } = localSettings;
        const { setDoc } = await import('firebase/firestore');
        
        await setDoc(doc(db, 'app_settings', 'global'), {
          ...publicSettings,
          updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'app_settings', 'secrets'), {
          openRouterApiKey,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        showToast('Configurações salvas!');
      } catch (err) {
        console.error('Error saving settings:', err);
        showToast('Erro ao salvar configurações', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 pb-24 overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Painel Admin</h1>
            <p className="text-neutral-500">Gerencie acessos e usuários</p>
          </div>
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </header>

        <div className="flex gap-2 mb-8 bg-white p-1 rounded-2xl shadow-sm border border-neutral-100 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${activeTab === 'requests' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <ClipboardList className="w-4 h-4" />
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('codes')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${activeTab === 'codes' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Key className="w-4 h-4" />
            Códigos
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${activeTab === 'notifications' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Bell className="w-4 h-4" />
            Notificar
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <SettingsIcon className="w-4 h-4" />
            App
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {requests.length === 0 && <p className="text-center py-12 text-neutral-400">Nenhum pedido pendente.</p>}
              {requests.map(req => (
                <div key={req.id} className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{req.email || req.id.substring(0, 10)}</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Calendar className="w-3 h-3" />
                      {req.createdAt?.toDate ? format(req.createdAt.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR }) : 'Recent'}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                      req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRejectRequest(req.id)}
                        className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleApproveRequest(req)}
                        className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'codes' && (
            <motion.div 
              key="codes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                <h3 className="font-bold text-neutral-900 mb-4">Gerar Novo Código</h3>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="CÓDIGO"
                    value={newCode.code}
                    onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                  <input 
                    type="number" 
                    placeholder="Usos"
                    value={newCode.maxUses}
                    onChange={e => setNewCode({...newCode, maxUses: parseInt(e.target.value) || 1})}
                    className="w-24 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button 
                    onClick={handleCreateCode}
                    className="bg-neutral-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {codes.map(code => (
                  <div key={code.id} className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-neutral-900 text-lg">{code.code}</p>
                      <p className="text-sm text-neutral-500">Usos: {code.currentUses} / {code.maxUses}</p>
                    </div>
                    <div className="flex gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${code.isUsed ? 'bg-neutral-100 text-neutral-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        {code.isUsed ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                      </div>
                      <button 
                        onClick={() => handleDeleteCode(code.id)}
                        className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {users.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : u.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-400'}`}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{u.email || u.id.substring(0, 10)}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider">{u.role}</p>
                        <span className="text-neutral-300">•</span>
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                          u.status === 'approved' ? 'text-emerald-600' : 
                          u.status === 'pending' ? 'text-amber-600' : 'text-neutral-400'
                        }`}>{u.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleUserStatus(u.id, u.status === 'approved')}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${u.status === 'approved' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      title={u.status === 'approved' ? 'Revogar Acesso' : 'Liberar Acesso'}
                    >
                      {u.status === 'approved' ? <UserMinus className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
          {activeTab === 'notifications' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                <h3 className="font-bold text-neutral-900 mb-4">Enviar Notificação Global</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Título</label>
                    <input 
                      type="text" 
                      value={broadcast.title}
                      onChange={e => setBroadcast({...broadcast, title: e.target.value})}
                      placeholder="Ex: Nova Funcionalidade!"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Mensagem</label>
                    <textarea 
                      value={broadcast.body}
                      onChange={e => setBroadcast({...broadcast, body: e.target.value})}
                      placeholder="Descreva a novidade..."
                      rows={3}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!broadcast.title || !broadcast.body) return;
                      setIsSending(true);
                      await NotificationService.sendBroadcast(broadcast.title, broadcast.body);
                      setBroadcast({ title: '', body: '' });
                      setIsSending(false);
                      showToast('Notificação enviada!');
                    }}
                    disabled={isSending || !broadcast.title || !broadcast.body}
                    className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Enviar para Todos
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
                <h3 className="font-bold text-neutral-900 mb-6 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Configurações do Aplicativo
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Nome do App</label>
                      <input 
                        type="text" 
                        value={localSettings.appName}
                        onChange={e => setLocalSettings({...localSettings, appName: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Versão</label>
                      <input 
                        type="text" 
                        value={localSettings.appVersion}
                        onChange={e => setLocalSettings({...localSettings, appVersion: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-neutral-700">Descrição do App</label>
                      <button
                        onClick={improveDescription}
                        disabled={isImproving || !localSettings.appDescription || !localSettings.openRouterApiKey}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                      >
                        {isImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Melhorar com IA
                      </button>
                    </div>
                    <textarea 
                      value={localSettings.appDescription}
                      onChange={e => setLocalSettings({...localSettings, appDescription: e.target.value})}
                      rows={4}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Chave API OpenRouter</label>
                    <input 
                      type="password" 
                      value={localSettings.openRouterApiKey}
                      onChange={e => setLocalSettings({...localSettings, openRouterApiKey: e.target.value})}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Usada para melhorar a descrição do app com o modelo nvidia/nemotron-3-super-120b-a12b:free.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Link Play Store</label>
                    <input 
                      type="text" 
                      value={localSettings.playStoreUrl}
                      onChange={e => setLocalSettings({...localSettings, playStoreUrl: e.target.value})}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-neutral-200"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
