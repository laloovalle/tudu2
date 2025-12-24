import React, { useState } from 'react';
import { User } from '../types';
import { login } from '../services/apiService';
import { Loader2, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden">
        
        {/* Decorative Background Blur */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                 <Lock className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h1>
            <p className="text-slate-500 mb-8 text-center">Ingresa tus credenciales para acceder a TuDú EO</p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-medium"
                            placeholder="nombre@empresa.com"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contraseña</label>
                     <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-medium"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2025 Estudio Ovalle. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};