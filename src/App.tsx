import React, { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import { ShoppingList } from './components/ShoppingList';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { AdminPanel } from './components/AdminPanel';
import { 
  ShoppingCart, 
  History as HistoryIcon, 
  Settings as SettingsIcon,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { NotificationService } from './lib/notifications';

function AppContent() {
  const { isAdmin, user, profile, appSettings, isFeminine } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'history' | 'settings' | 'admin'>('list');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [toast, setToast] = useState<{ title: string, body: string } | null>(null);
  const logoClickCount = useRef(0);
  const logoClickTimeout = useRef<any>(null);

  const toastTimeout = useRef<any>(null);

  useEffect(() => {
    const handleAppNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast({ title: customEvent.detail.title, body: customEvent.detail.body });
      
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      toastTimeout.current = setTimeout(() => setToast(null), 5000);
    };
    
    window.addEventListener('app-notification', handleAppNotification);
    return () => window.removeEventListener('app-notification', handleAppNotification);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (user && profile?.status === 'approved') {
      NotificationService.requestPermission().then(granted => {
        if (granted) {
          unsub = NotificationService.listenForNotifications(user.uid, isAdmin);
          NotificationService.checkOldLists(user.uid);
        }
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, [user, profile?.status, isAdmin]);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimeout.current) clearTimeout(logoClickTimeout.current);
    
    logoClickTimeout.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 2000);

    if (logoClickCount.current >= 5) {
      if (isAdmin) {
        setActiveTab('admin');
      } else {
        setShowAdminLogin(true);
      }
      logoClickCount.current = 0;
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 selection:bg-rose-100 selection:text-rose-900 ${isFeminine ? 'bg-rose-50' : 'bg-neutral-50 selection:bg-emerald-100 selection:text-emerald-900'}`}>
      <AuthGuard>
        <main className="pb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'list' && <ShoppingList key="list" />}
            {activeTab === 'history' && <History key="history" />}
            {activeTab === 'settings' && <Settings key="settings" />}
            {activeTab === 'admin' && isAdmin && <AdminPanel key="admin" />}
          </AnimatePresence>
        </main>

        {/* Navigation Bar */}
        <nav className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-4 z-40 transition-all duration-500 ${isFeminine ? 'bg-rose-50/80 border-rose-100' : 'bg-white/80 border-neutral-100'}`}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('list')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'list' ? (isFeminine ? 'text-rose-600' : 'text-emerald-600') : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'list' ? (isFeminine ? 'bg-rose-100' : 'bg-emerald-50') : 'bg-transparent'}`}>
                <ShoppingCart className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Lista</span>
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? (isFeminine ? 'text-rose-600' : 'text-emerald-600') : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'history' ? (isFeminine ? 'bg-rose-100' : 'bg-emerald-50') : 'bg-transparent'}`}>
                <HistoryIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Histórico</span>
            </button>

            <div className="relative -top-6">
              <button 
                onClick={handleLogoClick}
                className={`w-16 h-16 text-white rounded-[24px] shadow-2xl flex items-center justify-center active:scale-90 transition-all ${isFeminine ? 'bg-rose-600 shadow-rose-200' : 'bg-neutral-900 shadow-neutral-400'}`}
              >
                <div className="w-8 h-8 border-4 border-white rounded-lg flex items-center justify-center font-black text-xl">
                  {appSettings?.appName?.charAt(0) || 'C'}
                </div>
              </button>
            </div>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? (isFeminine ? 'text-rose-600' : 'text-emerald-600') : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'settings' ? (isFeminine ? 'bg-rose-100' : 'bg-emerald-50') : 'bg-transparent'}`}>
                <SettingsIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Ajustes</span>
            </button>

            {isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'admin' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'admin' ? 'bg-neutral-100' : 'bg-transparent'}`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Admin</span>
              </button>
            )}
          </div>
        </nav>

        {/* Admin Login Modal (for non-admins who find the secret) */}
        <AnimatePresence>
          {showAdminLogin && !isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdminLogin(false)}
                className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-white rounded-[40px] p-10 text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Área Restrita</h2>
                <p className="text-neutral-500 mb-8">Esta seção é exclusiva para administradores autorizados.</p>
                <button 
                  onClick={() => setShowAdminLogin(false)}
                  className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Entendi
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Global Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-neutral-900 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>
                <p className="text-xs text-neutral-300 leading-relaxed">{toast.body}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthGuard>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
