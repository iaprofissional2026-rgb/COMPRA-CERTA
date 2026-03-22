import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore';
import { 
  History as HistoryIcon, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  ShoppingBag,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function History() {
  const { user, isFeminine } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'shopping_lists'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shopping_lists');
    });
    return () => unsubscribe();
  }, [user]);

  const deleteList = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shopping_lists', id));
      setDeleteConfirm(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `shopping_lists/${id}`);
    }
  };

  return (
    <div className={`min-h-screen px-4 py-6 pb-32 overflow-x-hidden transition-colors duration-500 ${isFeminine ? 'bg-rose-50' : 'bg-neutral-50'}`}>
      <div className="w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedList ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <header className="mb-8">
                <h1 className={`text-3xl font-bold transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>Histórico</h1>
                <p className={`transition-colors ${isFeminine ? 'text-rose-500' : 'text-neutral-500'}`}>Suas compras anteriores</p>
              </header>

              {lists.length === 0 && (
                <div className="text-center py-20">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${isFeminine ? 'bg-rose-100' : 'bg-neutral-100'}`}>
                    <HistoryIcon className={`w-10 h-10 transition-colors ${isFeminine ? 'text-rose-300' : 'text-neutral-300'}`} />
                  </div>
                  <p className={`font-medium transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-400'}`}>Nenhum histórico encontrado</p>
                </div>
              )}

              <div className="space-y-4">
                {lists.map((list) => (
                  <div 
                    key={list.id}
                    onClick={() => setSelectedList(list)}
                    className={`p-5 rounded-3xl shadow-sm border flex items-center justify-between cursor-pointer transition-all group ${isFeminine ? 'bg-white border-rose-100 hover:border-rose-300' : 'bg-white border-neutral-100 hover:border-emerald-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isFeminine ? 'bg-rose-50 text-rose-400 group-hover:bg-rose-100 group-hover:text-rose-600' : 'bg-neutral-50 text-neutral-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={`font-bold transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>
                          {list.createdAt?.toDate ? format(list.createdAt.toDate(), "dd 'de' MMMM", { locale: ptBR }) : 'Recent'}
                        </p>
                        <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-400'}`}>
                          {list.items.length} itens • R$ {list.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(list.id);
                        }}
                        className={`w-10 h-10 transition-colors flex items-center justify-center ${isFeminine ? 'text-rose-200 hover:text-red-500' : 'text-neutral-200 hover:text-red-500'}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <ChevronRight className={`w-5 h-5 transition-colors ${isFeminine ? 'text-rose-300' : 'text-neutral-300'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button 
                onClick={() => setSelectedList(null)}
                className={`flex items-center gap-2 font-bold mb-6 transition-colors ${isFeminine ? 'text-rose-500 hover:text-rose-900' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </button>

              <div className={`rounded-[40px] shadow-xl border overflow-hidden transition-all ${isFeminine ? 'bg-white border-rose-100' : 'bg-white border-neutral-100'}`}>
                <div className={`p-8 text-white transition-colors ${isFeminine ? 'bg-rose-600' : 'bg-neutral-900'}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 transition-colors ${isFeminine ? 'text-rose-200' : 'text-neutral-400'}`}>Lista de Compra</p>
                  <h2 className="text-3xl font-bold">
                    {selectedList.createdAt?.toDate ? format(selectedList.createdAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Recent'}
                  </h2>
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isFeminine ? 'text-rose-200' : 'text-neutral-400'}`}>Total</p>
                      <p className="text-2xl font-black">R$ {selectedList.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isFeminine ? 'text-rose-200' : 'text-neutral-400'}`}>Itens</p>
                      <p className="text-2xl font-black">{selectedList.items.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8 space-y-4">
                  {selectedList.items.map((item: any, idx: number) => (
                    <div key={item.id || idx} className={`flex items-center justify-between py-3 border-b last:border-0 transition-colors ${isFeminine ? 'border-rose-50' : 'border-neutral-50'}`}>
                      <div>
                        <p className={`font-bold transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>{item.name}</p>
                        <p className={`text-xs transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-400'}`}>{item.quantity}x • {item.category}</p>
                      </div>
                      <p className={`font-bold transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>R$ {(parseFloat(item.price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Excluir Histórico?</h3>
              <p className="text-neutral-500 mb-8">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteList(deleteConfirm)}
                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
