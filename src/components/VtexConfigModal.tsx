
import React, { useState, useEffect } from 'react';
import { X, Save, ShieldCheck, Globe, Key } from 'lucide-react';
import { VtexConfig } from '../types';

interface VtexConfigModalProps {
  onClose: () => void;
  onSave: (config: VtexConfig) => void;
  initialConfig?: VtexConfig | null;
}

export const VtexConfigModal: React.FC<VtexConfigModalProps> = ({ onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<VtexConfig>({
    accountName: 'oechsle',
    appKey: '',
    appToken: '',
    environment: 'vtexcommercestable'
  });

  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Configuración VTEX</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400">
             <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Globe className="w-3 h-3" /> Account Name
            </label>
            <input 
              type="text"
              required
              value={config.accountName}
              onChange={e => setConfig({...config, accountName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="ej: oechsle"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Key className="w-3 h-3" /> App Key
            </label>
            <input 
              type="text"
              required
              value={config.appKey}
              onChange={e => setConfig({...config, appKey: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="vtexappkey-..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> App Token
            </label>
            <input 
              type="password"
              required
              value={config.appToken}
              onChange={e => setConfig({...config, appToken: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="••••••••••••••••"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Credenciales
            </button>
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Las credenciales se guardan localmente en su navegador y nunca salen de esta aplicación excepto para comunicarse con VTEX.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
