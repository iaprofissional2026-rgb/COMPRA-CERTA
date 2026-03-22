import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore';
import { ShoppingCart, Lock, Key, CheckCircle2, AlertCircle, Loader2, CreditCard, Copy, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function PaymentScreen({ onSolicitar, onEnterCode, logout, isSubmitting }: { onSolicitar: () => void, onEnterCode: () => void, logout: () => void, isSubmitting: boolean }) {
  const [copied, setCopied] = useState(false);
  const pixKey = '80097004952';

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-neutral-100"
      >
        <div className="flex justify-end mb-4">
          <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-600">Sair</button>
        </div>
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-black text-neutral-900 mb-2 tracking-tight">Acesso Premium</h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Para utilizar o aplicativo, realize o pagamento único de <span className="font-bold text-neutral-900">R$ 9,99</span> via Pix.
        </p>

        <div className="bg-neutral-50 rounded-3xl p-6 mb-8 border border-neutral-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Chave Pix</p>
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-100">
            <code className="text-lg font-mono font-bold text-neutral-900">{pixKey}</code>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-neutral-50 rounded-xl transition-colors text-emerald-600"
            >
              {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button 
          onClick={onSolicitar}
          disabled={isSubmitting}
          className="w-full bg-neutral-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 active:scale-95 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Solicitando...' : 'Solicitar Acesso'}
          {!isSubmitting && <ExternalLink className="w-5 h-5" />}
        </button>

        <button 
          onClick={onEnterCode}
          className="w-full mt-4 bg-white border border-neutral-200 text-neutral-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
        >
          <Key className="w-5 h-5 text-emerald-600" />
          Já tenho um código
        </button>
        
        <p className="mt-6 text-xs text-neutral-400">
          Após o pagamento, clique em solicitar e aguarde a aprovação do administrador.
        </p>
      </motion.div>
    </div>
  );
}

function PendingApprovalScreen({ onEnterCode, logout }: { onEnterCode: () => void, logout: () => void }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-neutral-100"
      >
        <div className="flex justify-end mb-4">
          <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-600">Sair</button>
        </div>
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-neutral-900 mb-2 tracking-tight">Solicitação Enviada</h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Sua solicitação está sendo analisada. Por favor, aguarde o administrador liberar seu acesso.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-amber-600 font-bold bg-amber-50 py-3 px-6 rounded-2xl inline-block mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          Aguardando Aprovação...
        </div>

        <button 
          onClick={onEnterCode}
          className="w-full bg-white border border-neutral-200 text-neutral-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
        >
          <Key className="w-5 h-5 text-emerald-600" />
          Usar código de acesso
        </button>
      </motion.div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signIn, logout, isAdmin, appSettings } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);

  const handleApplyCode = async () => {
    if (!code.trim() || !user) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const q = query(collection(db, 'access_codes'), where('code', '==', code.trim()), where('isUsed', '==', false));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Código inválido ou já utilizado.');
      } else {
        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data();

        if (codeData.currentUses >= codeData.maxUses) {
          setError('Este código atingiu o limite de usos.');
        } else {
          // Update user to active
          await updateDoc(doc(db, 'users', user.uid), {
            isActive: true,
            status: 'approved'
          });
          
          // Update code uses
          await updateDoc(codeDoc.ref, {
            currentUses: codeData.currentUses + 1,
            isUsed: codeData.currentUses + 1 >= codeData.maxUses
          });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'access_codes');
      setError('Erro ao processar código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: 'pending'
      });
      
      await addDoc(collection(db, 'notifications'), {
        type: 'admin_broadcast',
        title: 'Nova Solicitação de Acesso',
        body: `O usuário ${user.email} solicitou acesso ao aplicativo.`,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center border border-neutral-100"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">{appSettings?.appName || 'Compra Certa'}</h1>
          <p className="text-neutral-500 mb-8">{appSettings?.appDescription || 'Sua lista de compras premium, rápida e eficiente.'}</p>
          
          <button
            onClick={signIn}
            className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (profile && profile.status === 'new' && !isAdmin && !showAccessCode) {
    return <PaymentScreen onSolicitar={handleRequestAccess} onEnterCode={() => setShowAccessCode(true)} logout={logout} isSubmitting={isSubmitting} />;
  }

  if (profile && profile.status === 'pending' && !isAdmin && !showAccessCode) {
    return <PendingApprovalScreen onEnterCode={() => setShowAccessCode(true)} logout={logout} />;
  }

  if ((profile && !profile.isActive && !isAdmin) || showAccessCode) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Acesso Restrito</h2>
            </div>
            <div className="flex items-center gap-4">
              {showAccessCode && (
                <button 
                  onClick={() => setShowAccessCode(false)}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Voltar
                </button>
              )}
              <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-600">Sair</button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Código de Acesso</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="DIGITE SEU CÓDIGO"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none font-mono tracking-widest"
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}
            </div>

            <button
              onClick={handleApplyCode}
              disabled={isSubmitting || !code.trim()}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Ativar Acesso'}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-neutral-400">Ou</span></div>
            </div>

            <button
              onClick={handleRequestAccess}
              disabled={isSubmitting}
              className="w-full bg-white border border-neutral-200 text-neutral-700 py-4 rounded-2xl font-semibold hover:bg-neutral-50 transition-colors"
            >
              Comprar Acesso / Solicitar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
