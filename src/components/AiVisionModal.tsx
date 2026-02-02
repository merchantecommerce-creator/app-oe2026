
import React, { useState } from 'react';
import { X, Send, BrainCircuit, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { ProductImage } from '../types';
import { queryImagesWithPrompt } from '../services/geminiService';

interface AiVisionModalProps {
  images: ProductImage[];
  onClose: () => void;
}

export const AiVisionModal: React.FC<AiVisionModalProps> = ({ images, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
        const blobs = images.map(img => img.blob).filter((b): b is Blob => b !== null);
        const result = await queryImagesWithPrompt(blobs, prompt);
        setResponse(result);
    } catch (err: any) {
        setError(err.message || "Error al procesar la solicitud.");
    } finally {
        setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Describe estas imágenes detalladamente para un catálogo.",
    "Extrae materiales, colores y dimensiones visibles.",
    "Genera un prompt para recrear este estilo en Midjourney.",
    "¿Qué diferencias hay entre estas imágenes?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
                <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900">Asistente Vision IA</h3>
                <p className="text-xs text-indigo-600 font-medium">{images.length} imágenes seleccionadas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-500 transition-colors">
             <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selected Images Preview */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img) => (
              <div key={img.id} className="w-20 h-20 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
                <img src={img.objectUrl || ''} alt="Preview" className="w-full h-full object-contain" />
              </div>
            ))}
          </div>

          {/* Response Area */}
          <div className="min-h-[200px] bg-gray-50 rounded-xl p-5 border border-gray-100 relative group">
            {!response && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                    <p className="text-sm italic">Haz una pregunta sobre las imágenes...</p>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[1px] z-10 rounded-xl">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                    <p className="text-sm font-medium text-indigo-600">Analizando contenido visual...</p>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4 border border-red-100">
                    {error}
                </div>
            )}

            {response && (
                <div className="prose prose-sm max-w-none text-gray-800 animate-fade-in whitespace-pre-wrap">
                    {response}
                </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, idx) => (
                <button 
                    key={idx}
                    onClick={() => { setPrompt(p); }}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                    {p}
                </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-3">
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="flex-1 px-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
