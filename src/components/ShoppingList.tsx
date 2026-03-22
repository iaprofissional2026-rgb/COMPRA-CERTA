import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ShoppingCart, 
  History, 
  Settings as SettingsIcon,
  PlusCircle,
  ChevronRight,
  Calculator,
  Tag,
  AlertCircle,
  Flower2,
  X,
  Loader2,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'alimentos', name: 'Alimentos', color: 'bg-amber-100 text-amber-700' },
  { id: 'bebidas', name: 'Bebidas', color: 'bg-blue-100 text-blue-700' },
  { id: 'limpeza', name: 'Limpeza', color: 'bg-purple-100 text-purple-700' },
  { id: 'higiene', name: 'Higiene', color: 'bg-pink-100 text-pink-700' },
  { id: 'feminino', name: 'Feminino', color: 'bg-rose-100 text-rose-700' },
  { id: 'outros', name: 'Outros', color: 'bg-neutral-100 text-neutral-700' },
];

const COMMON_PRODUCTS = [
  'Arroz', 'Feijão', 'Macarrão', 'Açúcar', 'Café', 'Leite', 'Pão', 'Manteiga', 
  'Óleo', 'Sal', 'Carne Moída', 'Frango', 'Ovos', 'Queijo', 'Presunto',
  'Detergente', 'Sabão em Pó', 'Amaciante', 'Papel Higiênico', 'Creme Dental',
  'Shampoo', 'Sabonete', 'Banana', 'Maçã', 'Cebola', 'Alho', 'Batata', 'Tomate'
];

const PRODUCT_UNITS: { [key: string]: string } = {
  'arroz': 'kg',
  'feijão': 'kg',
  'açúcar': 'kg',
  'carne': 'kg',
  'frango': 'kg',
  'batata': 'kg',
  'cebola': 'kg',
  'tomate': 'kg',
  'maçã': 'kg',
  'banana': 'kg',
  'sal': 'kg',
  'farinha': 'kg',
  'leite': 'litro',
  'suco': 'litro',
  'refrigerante': 'litro',
  'água': 'litro',
  'vinho': 'litro',
  'cerveja': 'ml',
  'óleo': 'ml',
  'azeite': 'ml',
  'detergente': 'ml',
  'shampoo': 'ml',
  'amaciante': 'litro',
  'sabão em pó': 'kg',
  'manteiga': 'g',
  'queijo': 'g',
  'presunto': 'g',
  'café': 'g',
};

export function ShoppingList() {
  const { user, appSettings, isFeminine, setIsFeminine } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: '', unitsCount: 1, quantity: '1', unit: 'un', price: '', category: 'alimentos', brand: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [detectedUnit, setDetectedUnit] = useState<string | null>(null);

  const total = useMemo(() => {
    return activeItems.reduce((acc, item) => {
      const multiplier = item.unitsCount || (parseFloat(item.quantity) || 1);
      return acc + (parseFloat(item.price) || 0) * multiplier;
    }, 0);
  }, [activeItems]);

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const cleanPrice = newItem.price.replace(/\./g, '').replace(',', '.');
    
    const finalQuantity = newItem.unit === 'un' 
      ? (newItem.quantity === '1' || !newItem.quantity ? '' : `${newItem.quantity} un`)
      : `${newItem.quantity} ${newItem.unit}`;
    
    if (editingId) {
      setActiveItems(activeItems.map(item => 
        item.id === editingId ? { ...item, ...newItem, quantity: finalQuantity, price: cleanPrice } : item
      ));
      setToast({ message: 'Item atualizado!', type: 'success' });
    } else {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...newItem,
        quantity: finalQuantity,
        price: cleanPrice,
        isBought: false
      };
      setActiveItems([item, ...activeItems]);
      setToast({ message: 'Item adicionado!', type: 'success' });
    }
    
    setNewItem({ name: '', unitsCount: 1, quantity: '1', unit: 'un', price: '', category: 'alimentos', brand: '' });
    setIsAdding(false);
    setEditingId(null);
    setSuggestions([]);
    setDetectedUnit(null);
    
    setTimeout(() => setToast(null), 3000);
  };

  const startEdit = (item: any) => {
    let q = item.quantity || '1';
    let u = 'un';
    const match = q.match(/^([\d.,]+)\s*(kg|g|litro|ml|pct|un)?$/i);
    if (match) {
      q = match[1];
      u = match[2] ? match[2].toLowerCase() : 'un';
    } else if (q === '') {
      q = '1';
      u = 'un';
    }
    setNewItem({
      name: item.name,
      unitsCount: item.unitsCount || 1,
      quantity: q,
      unit: u,
      price: item.price ? parseFloat(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
      category: item.category,
      brand: item.brand || ''
    });
    setEditingId(item.id);
    setIsAdding(true);
    setDetectedUnit(u !== 'un' ? u : null);
  };

  const clearList = () => {
    setActiveItems([]);
    setIsClearing(false);
    setToast({ message: 'Lista limpa!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNameChange = (val: string) => {
    // Detect unit
    const lowerVal = val.toLowerCase();
    let unitFound = 'un';
    for (const [prod, unit] of Object.entries(PRODUCT_UNITS)) {
      if (lowerVal.includes(prod)) {
        unitFound = unit;
        break;
      }
    }
    setDetectedUnit(unitFound !== 'un' ? unitFound : null);
    
    // If unit found and quantity is default '1', clear it to make it easy for the user to type
    if (unitFound !== 'un' && newItem.quantity === '1') {
      setNewItem(prev => ({ ...prev, name: val, quantity: '', unit: unitFound }));
    } else {
      setNewItem(prev => ({ ...prev, name: val, unit: unitFound }));
    }

    if (val.length > 1) {
      const filtered = COMMON_PRODUCTS.filter(p => 
        p.toLowerCase().startsWith(val.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handlePriceChange = (val: string) => {
    // Remove non-digits
    const cleanValue = val.replace(/\D/g, '');
    if (!cleanValue) {
      setNewItem({ ...newItem, price: '' });
      return;
    }
    
    // Format as currency (cents to BRL)
    const numericValue = parseInt(cleanValue) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    setNewItem({ ...newItem, price: formatted });
  };

  const toggleItem = (id: string) => {
    setActiveItems(activeItems.map(item => 
      item.id === id ? { ...item, isBought: !item.isBought } : item
    ));
  };

  const removeItem = (id: string) => {
    setActiveItems(activeItems.filter(item => item.id !== id));
  };

  const saveList = async () => {
    if (activeItems.length === 0 || !user) return;
    try {
      await addDoc(collection(db, 'shopping_lists'), {
        userId: user.uid,
        items: activeItems,
        total,
        createdAt: serverTimestamp()
      });
      setActiveItems([]);
      setToast({ message: 'Lista salva no histórico!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'shopping_lists');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-500 ${isFeminine ? 'bg-rose-50' : 'bg-neutral-50'}`}>
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 sm:px-6 flex-shrink-0">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-4xl font-black tracking-tight transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>{appSettings?.appName || 'Minha Lista'}</h1>
            <p className={`font-medium transition-colors ${isFeminine ? 'text-rose-500' : 'text-neutral-500'}`}>O que vamos comprar hoje?</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsClearing(true)}
              className={`w-14 h-14 bg-white border-2 text-red-500 rounded-2xl shadow-sm flex items-center justify-center transition-all active:scale-90 ${isFeminine ? 'border-rose-100 hover:bg-rose-50' : 'border-neutral-100 hover:bg-neutral-50'}`}
              title="Limpar Lista"
            >
              <Trash2 className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setIsFeminine(!isFeminine)}
              className={`w-14 h-14 border-2 rounded-2xl shadow-sm flex items-center justify-center transition-all active:scale-90 ${isFeminine ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-neutral-100 text-rose-600 hover:bg-rose-50'}`}
              title="Alternar Tema Feminino"
            >
              <Flower2 className="w-7 h-7" />
            </button>
          </div>
        </header>

        <div className={`rounded-[32px] shadow-xl border p-6 mb-6 flex items-center justify-between transition-all ${isFeminine ? 'bg-rose-100/50 border-rose-200 shadow-rose-200/50' : 'bg-white border-neutral-100 shadow-neutral-200/50'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isFeminine ? 'bg-rose-200 text-rose-700' : 'bg-emerald-50 text-emerald-600'}`}>
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-400'}`}>Total Estimado</p>
              <p className={`text-2xl font-black transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {activeItems.length > 0 && (
            <button 
              onClick={saveList}
              className={`px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg ${isFeminine ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200' : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-200'}`}
            >
              Finalizar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-40 w-full max-w-2xl mx-auto no-scrollbar">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activeItems.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${isFeminine ? 'bg-rose-100' : 'bg-neutral-100'}`}>
                  <ShoppingCart className={`w-10 h-10 transition-colors ${isFeminine ? 'text-rose-300' : 'text-neutral-300'}`} />
                </div>
                <p className={`font-medium transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-400'}`}>
                  Sua lista está vazia
                </p>
                <button 
                  onClick={() => {
                    setIsAdding(true);
                    setDetectedUnit(null);
                  }} 
                  className={`font-bold mt-2 transition-colors ${isFeminine ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  Começar a adicionar
                </button>
              </motion.div>
            )}
            {activeItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`group bg-white p-4 rounded-2xl shadow-sm border transition-all flex items-center justify-between ${item.isBought ? 'border-neutral-100 opacity-60' : isFeminine ? 'border-rose-100' : 'border-neutral-200'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => toggleItem(item.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${item.isBought ? (isFeminine ? 'bg-rose-500' : 'bg-emerald-500') + ' text-white' : 'border-2 border-neutral-200 text-transparent'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-bold text-neutral-900 ${item.isBought ? 'line-through text-neutral-400' : ''}`}>
                      {item.name}
                      {item.brand && (
                        <span className="ml-2 text-xs font-normal text-neutral-400">
                          {item.brand}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-neutral-500">
                        {item.unitsCount 
                          ? (!item.quantity ? `${item.unitsCount} un` : `${item.unitsCount}x ${item.quantity}`)
                          : (item.quantity?.match(/[a-zA-Z]/) ? item.quantity : `${item.quantity || 1}x`)}
                      </span>
                      {item.price && <span className="text-xs font-medium text-neutral-500">• R$ {(parseFloat(item.price)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${CATEGORIES.find(c => c.id === item.category)?.color}`}>
                        {CATEGORIES.find(c => c.id === item.category)?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startEdit(item)}
                    className="w-10 h-10 text-neutral-300 hover:text-emerald-600 transition-colors flex items-center justify-center"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="w-10 h-10 text-neutral-300 hover:text-red-500 transition-colors flex items-center justify-center"
                    title="Remover"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Action Button */}
      <div className="fixed bottom-28 right-6 z-40 flex flex-col gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsAdding(true);
            setDetectedUnit(null);
          }}
          className={`w-16 h-16 rounded-[24px] shadow-2xl flex items-center justify-center transition-all ${isFeminine ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          <Plus className="w-10 h-10" />
        </motion.button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${
              toast.type === 'success' ? (isFeminine ? 'bg-rose-600' : 'bg-emerald-600') + ' text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdding(false);
                setDetectedUnit(null);
              }}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neutral-900">{editingId ? 'Editar Item' : 'Novo Item'}</h2>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewItem({ name: '', unitsCount: 1, quantity: '1', unit: 'un', price: '', category: 'alimentos', brand: '' });
                    setDetectedUnit(null);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Nome do Produto</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newItem.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Ex: Leite Integral"
                    className={`w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'}`}
                  />
                  
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full bg-white mt-1 rounded-xl shadow-xl border border-neutral-100 overflow-hidden"
                      >
                        {suggestions.map((s, idx) => (
                          <button
                            key={`${s}-${idx}`}
                            onClick={() => {
                              const sName = s;
                              setSuggestions([]);
                              
                              // Detect unit for suggestion
                              const lowerVal = sName.toLowerCase();
                              let unitFound = 'un';
                              for (const [prod, unit] of Object.entries(PRODUCT_UNITS)) {
                                if (lowerVal.includes(prod)) {
                                  unitFound = unit;
                                  break;
                                }
                              }
                              setDetectedUnit(unitFound !== 'un' ? unitFound : null);
                              
                              // Update newItem with name and potentially clear quantity
                              if (unitFound !== 'un' && newItem.quantity === '1') {
                                setNewItem(prev => ({ ...prev, name: sName, quantity: '', unit: unitFound }));
                              } else {
                                setNewItem(prev => ({ ...prev, name: sName, unit: unitFound }));
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors font-medium text-neutral-700 border-b border-neutral-50 last:border-0"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Unidades</label>
                    <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 h-[42px]">
                      <button 
                        onClick={() => setNewItem({...newItem, unitsCount: Math.max(1, (newItem.unitsCount || 1) - 1)})}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        -
                      </button>
                      <span className="font-bold text-neutral-900">{newItem.unitsCount || 1}</span>
                      <button 
                        onClick={() => setNewItem({...newItem, unitsCount: (newItem.unitsCount || 1) + 1})}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Preço (Unidade)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={newItem.price}
                      onChange={e => handlePriceChange(e.target.value)}
                      placeholder="0,00"
                      className={`w-full h-[42px] bg-neutral-50 border border-neutral-200 rounded-xl px-4 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Tamanho/Peso</label>
                    <div className="flex gap-2 h-[42px]">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                        placeholder="1"
                        className={`w-16 bg-neutral-50 border border-neutral-200 rounded-xl px-3 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'}`}
                      />
                      <select
                        value={newItem.unit}
                        onChange={e => setNewItem({...newItem, unit: e.target.value})}
                        className={`flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-2 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'} appearance-none`}
                      >
                        <option value="un">Un</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="litro">L</option>
                        <option value="ml">ml</option>
                        <option value="pct">pct</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Marca</label>
                    <input 
                      type="text" 
                      value={newItem.brand}
                      onChange={e => setNewItem({...newItem, brand: e.target.value})}
                      placeholder="Ex: Nestlé"
                      className={`w-full h-[42px] bg-neutral-50 border border-neutral-200 rounded-xl px-4 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 uppercase tracking-wider">Categoria</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className={`w-full h-[42px] bg-neutral-50 border border-neutral-200 rounded-xl px-4 outline-none transition-all font-medium text-sm focus:ring-2 ${isFeminine ? 'focus:ring-rose-500' : 'focus:ring-emerald-500'} appearance-none`}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={addItem}
                  disabled={!newItem.name.trim()}
                  className={`w-full py-3.5 mt-1 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 ${isFeminine ? 'bg-rose-600 text-white shadow-rose-100 hover:bg-rose-700' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'}`}
                >
                  {editingId ? 'Salvar Alterações' : 'Adicionar à Lista'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear List Confirmation Modal */}
      <AnimatePresence>
        {isClearing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClearing(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Limpar Lista?</h3>
              <p className="text-neutral-500 mb-8">Isso removerá todos os itens da sua lista atual. Esta ação não pode ser desfeita.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={clearList}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all active:scale-95"
                >
                  Sim, Limpar Tudo
                </button>
                <button 
                  onClick={() => setIsClearing(false)}
                  className="w-full bg-neutral-100 text-neutral-700 py-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
