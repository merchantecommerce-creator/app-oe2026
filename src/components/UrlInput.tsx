
import React, { useState, useRef } from 'react';
import { Search, Loader2, Upload, Link as LinkIcon } from 'lucide-react';

interface UrlInputProps {
  onSearch: (url: string) => void;
  onUpload: (files: FileList) => void;
  isLoading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSearch, onUpload, isLoading }) => {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        onUpload(e.target.files);
        e.target.value = '';
    }
  };

  return (
    <div className="w-full space-y-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-gray-300 group-focus-within:text-brand-600 transition-colors" />
                </div>
                <input
                  type="url"
                  className="block w-full pl-14 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-50 focus:border-brand-500 focus:bg-white transition-all text-base font-medium"
                  placeholder="https://www.oechsle.pe/..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input}
              className="px-10 py-5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-brand-100"
            >
              {isLoading && input ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Extraer Ahora</span>
                </>
              )}
            </button>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                Formatos: JPG · PNG · WEBP · HEIC
            </p>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">O también</span>
              <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                  multiple
              />
              <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all shadow-lg group uppercase tracking-widest"
              >
                  {isLoading && !input ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                      <Upload className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  )}
                  <span>Cargar Local</span>
              </button>
            </div>
        </div>
    </div>
  );
};
