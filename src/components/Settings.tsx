import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, Info, Moon, Sun, Flower2 } from 'lucide-react';

export function Settings() {
  const { user, profile, logout, isAdmin, isFeminine, setIsFeminine } = useAuth();

  return (
    <div className={`min-h-screen px-4 py-6 pb-32 overflow-x-hidden transition-colors duration-500 ${isFeminine ? 'bg-rose-50' : 'bg-neutral-50'}`}>
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className={`text-3xl font-bold transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>Configurações</h1>
          <p className={`transition-colors ${isFeminine ? 'text-rose-500' : 'text-neutral-500'}`}>Gerencie sua conta e preferências</p>
        </header>

        <div className="space-y-6">
          <div className={`rounded-3xl shadow-sm border overflow-hidden transition-all ${isFeminine ? 'bg-white border-rose-100' : 'bg-white border-neutral-100'}`}>
            <div className={`p-6 border-b flex items-center gap-4 transition-colors ${isFeminine ? 'border-rose-50' : 'border-neutral-50'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-colors ${isFeminine ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className={`font-bold text-lg transition-colors ${isFeminine ? 'text-rose-900' : 'text-neutral-900'}`}>{user?.displayName || 'Usuário'}</h2>
                <p className={`text-sm transition-colors ${isFeminine ? 'text-rose-400' : 'text-neutral-500'}`}>{user?.email}</p>
                {isAdmin && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full transition-colors ${isFeminine ? 'bg-rose-600 text-white' : 'bg-neutral-900 text-white'}`}>Admin</span>
                )}
              </div>
            </div>

            <div className="p-2">
              <button 
                onClick={() => setIsFeminine(!isFeminine)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors group ${isFeminine ? 'hover:bg-rose-50' : 'hover:bg-neutral-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isFeminine ? 'bg-rose-50 text-rose-600' : 'bg-neutral-50 text-neutral-400 group-hover:text-neutral-900'}`}>
                    <Flower2 className="w-5 h-5" />
                  </div>
                  <span className={`font-bold transition-colors ${isFeminine ? 'text-rose-700' : 'text-neutral-700'}`}>Tema Feminino</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isFeminine ? 'bg-rose-500' : 'bg-neutral-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isFeminine ? 'left-7' : 'left-1'}`} />
                </div>
              </button>

              <button className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors group ${isFeminine ? 'hover:bg-rose-50' : 'hover:bg-neutral-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isFeminine ? 'bg-rose-50 text-rose-600' : 'bg-neutral-50 text-neutral-400 group-hover:text-neutral-900'}`}>
                    <Info className="w-5 h-5" />
                  </div>
                  <span className={`font-bold transition-colors ${isFeminine ? 'text-rose-700' : 'text-neutral-700'}`}>Sobre o App</span>
                </div>
                <span className={`text-xs font-bold transition-colors ${isFeminine ? 'text-rose-300' : 'text-neutral-400'}`}>v1.0.0</span>
              </button>
            </div>
          </div>

          <button 
            onClick={logout}
            className={`w-full bg-white border py-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-colors ${isFeminine ? 'border-rose-100 text-rose-500 hover:bg-rose-50' : 'border-red-100 text-red-500 hover:bg-red-50'}`}
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
