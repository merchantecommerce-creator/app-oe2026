
import React from 'react';
import { Download, Loader2, Sparkles, Ruler, Wand2, Package } from 'lucide-react';
import { ProductImage } from '../types';

interface ImageCardProps {
  image: ProductImage;
  selected: boolean;
  onToggleSelect: () => void;
  onDownload: (img: ProductImage) => void;
  onAnalyze: (img: ProductImage) => void;
  onEdit: (img: ProductImage) => void;
  onGenerateFrom: (img: ProductImage) => void;
  isAnalyzing: boolean;
}

export const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  selected,
  onToggleSelect,
  onDownload, 
  onAnalyze, 
  onEdit,
  onGenerateFrom,
  isAnalyzing 
}) => {
  return (
    <div 
      className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-300 ${
        selected 
          ? 'ring-4 ring-brand-600 shadow-2xl scale-[1.02]' 
          : 'border border-gray-100 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <div className="aspect-square relative bg-white flex items-center justify-center p-6 transition-colors group-hover:bg-gray-50">
        {/* Selection Checkbox */}
        <div className="absolute top-4 left-4 z-30">
            <button 
                onClick={onToggleSelect}
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  selected 
                    ? 'bg-brand-600 border-brand-600 text-white shadow-lg' 
                    : 'bg-white border-gray-200 text-transparent hover:border-brand-300'
                }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full bg-current transition-all ${selected ? 'scale-100' : 'scale-0'}`} />
            </button>
        </div>

        <div className="absolute inset-0 cursor-pointer z-10" onClick={onToggleSelect} />

        {image.status === 'converting' ? (
           <div className="flex flex-col items-center gap-3">
             <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
             <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Processing...</span>
           </div>
        ) : image.objectUrl ? (
          <img 
            src={image.objectUrl} 
            alt="Product" 
            className="w-full h-full object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-red-300">
             {/* Fix: Added Package icon which was missing from imports */}
             <Package className="w-10 h-10 opacity-20" />
             <span className="text-[10px] font-bold uppercase">Load Error</span>
          </div>
        )}
        
        {/* Format Badge */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-gray-900 text-white shadow-lg">
                JPG HD
            </span>
        </div>
      </div>

      <div className="p-5 space-y-4 relative z-20 bg-white">
        <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight" title={image.suggestedName || "Sin nombre"}>
                    {image.suggestedName ? (
                        <span className="flex items-center gap-1.5 text-brand-600">
                             <Sparkles className="w-3 h-3" />
                             {image.suggestedName}
                        </span>
                    ) : (
                        <span className="text-gray-400 italic">ID_{image.id.substring(0,6)}</span>
                    )}
                </p>
                {image.width && (
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-widest">
                      {image.width} × {image.height} PX
                    </p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
            <button
                onClick={(e) => { e.stopPropagation(); onAnalyze(image); }}
                disabled={isAnalyzing || !!image.suggestedName}
                title="Renombrar con IA"
                className={`flex items-center justify-center h-10 rounded-xl border transition-all ${
                    image.suggestedName 
                    ? 'bg-brand-50 border-brand-100 text-brand-300 cursor-default'
                    : 'bg-white border-gray-100 text-gray-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50'
                }`}
            >
               {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onGenerateFrom(image); }}
                title="Generar Variación IA"
                className="flex items-center justify-center h-10 rounded-xl border border-gray-100 bg-white text-gray-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
               <Wand2 className="w-4 h-4" />
            </button>

             <button
                onClick={(e) => { e.stopPropagation(); onEdit(image); }}
                title="Editor de Medidas"
                className="flex items-center justify-center h-10 rounded-xl border border-gray-100 bg-white text-gray-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
               <Ruler className="w-4 h-4" />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); onDownload(image); }}
                disabled={!image.blob}
                title="Descargar"
                className="flex items-center justify-center h-10 text-white bg-gray-900 rounded-xl hover:bg-brand-600 transition-all disabled:opacity-50 shadow-sm"
            >
                <Download className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};
