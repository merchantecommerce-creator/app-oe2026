
import React, { useState } from 'react';
import { X, Wand2, Loader2, Download, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { generateAiImage } from '../services/geminiService';
import { ProductImage } from '../types';

interface AiGeneratorModalProps {
  referenceImage?: ProductImage | null;
  onClose: () => void;
  onAddToGallery: (blob: Blob, prompt: string, width?: number, height?: number) => void;
}

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({ referenceImage, onClose, onAddToGallery }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
        const blob = await generateAiImage(
            prompt, 
            referenceImage?.blob || undefined,
            referenceImage?.width,
            referenceImage?.height
        );
        const url = URL.createObjectURL(blob);
        setGeneratedBlob(blob);
        setGeneratedUrl(url);
    } catch (err: any) {
        setError(err.message || "No se pudo generar la imagen.");
    } finally {
        setIsGenerating(false);
    }
  };

  const downloadGenerated = () => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = `ai-generated-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 p-1.5 rounded-lg shadow-sm">
                <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
                <h3 className="font-bold text-gray-900">Generador de Imágenes IA</h3>
                <p className="text-xs text-brand-600 font-medium">Resolución Original: {referenceImage?.width ? `${referenceImage.width}x${referenceImage.height}px` : '1024x1024px'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors">
             <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Main Stage */}
          <div className="aspect-square w-full max-w-md mx-auto relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
             {generatedUrl ? (
                <img src={generatedUrl} alt="AI Generated" className="w-full h-full object-contain animate-fade-in" />
             ) : isGenerating ? (
                <div className="flex flex-col items-center gap-4 text-brand-600">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p className="font-medium animate-pulse">Creando tu imagen...</p>
                </div>
             ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Describe lo que quieres generar</p>
                </div>
             )}

             {referenceImage && !generatedUrl && !isGenerating && (
                <div className="absolute bottom-4 left-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded border overflow-hidden flex-shrink-0">
                        <img src={referenceImage.objectUrl || ''} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Usando como referencia</span>
                </div>
             )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instrucción para la IA</label>
            <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Un sofá isométrico de tela gris estilo nórdico, iluminación de estudio, fondo blanco puro..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none resize-none h-24 text-sm"
                disabled={isGenerating}
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {!generatedUrl ? (
            <button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 bg-brand-600 text-white py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all font-bold shadow-lg shadow-brand-100 flex items-center justify-center gap-2"
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                Generar Imagen
            </button>
          ) : (
            <>
                <button 
                    onClick={() => { setGeneratedUrl(null); setGeneratedBlob(null); }}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold"
                >
                    Nueva
                </button>
                <button 
                    onClick={downloadGenerated}
                    className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-bold flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Descargar
                </button>
                <button 
                    onClick={() => { if (generatedBlob) onAddToGallery(generatedBlob, prompt, referenceImage?.width, referenceImage?.height); }}
                    className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Usar
                </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
