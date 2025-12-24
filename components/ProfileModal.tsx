import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Save, Loader2, User as UserIcon, Mail, Lock, Briefcase, Phone, Link as LinkIcon, Shield, Clock } from 'lucide-react';

interface ProfileModalProps {
  currentUser: User;
  onSave: (updatedUser: User) => Promise<void>;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ currentUser, onSave, onClose }) => {
  const [formData, setFormData] = useState<User>(currentUser);
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(currentUser);
    setNewPassword('');
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Prepare the user object. If newPassword is set, include it.
      const userToSave = { ...formData };
      if (newPassword.trim()) {
        userToSave.password = newPassword.trim();
      }
      
      await onSave(userToSave);
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Error al actualizar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = ['admin', 'editor', 'colaborador', 'cliente'];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <UserIcon size={20} />
             </div>
             <h3 className="font-bold text-xl text-slate-800 dark:text-white">Editar Perfil</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                    <img 
                        src={formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <LinkIcon className="text-white w-6 h-6" />
                    </div>
                </div>
                <div className="flex-grow w-full space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">URL del Avatar</label>
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            value={formData.avatar || ''}
                            onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                            placeholder="https://..."
                            className="w-full pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400">Deja en blanco para usar un avatar generado automáticamente.</p>
                </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <UserIcon size={14} /> Nombre Completo
                    </label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Mail size={14} /> Email
                    </label>
                    <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Lock size={14} /> Contraseña
                    </label>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400">Ingresa texto solo si deseas cambiar tu clave actual.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Phone size={14} /> Teléfono
                    </label>
                    <input 
                        type="text" 
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                    />
                </div>
            </div>

            {/* Role & Position */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Briefcase size={14} /> Cargo / Puesto
                    </label>
                    <input 
                        type="text" 
                        value={formData.jobTitle || ''}
                        onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                        placeholder="Ej. Desarrollador Senior"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Shield size={14} /> Rol en Sistema
                    </label>
                    <select 
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white cursor-pointer"
                    >
                        {roleOptions.map(role => (
                            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Clock size={14} /> Horas Diarias
                    </label>
                    <input 
                        type="number" 
                        step="0.5"
                        value={formData.dailyHours || 8}
                        onChange={(e) => setFormData({...formData, dailyHours: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-white"
                    />
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="profile-form"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
};