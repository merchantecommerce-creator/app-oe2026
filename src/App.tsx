
import React, { useState, useCallback, useEffect } from 'react';
import { UrlInput } from './components/UrlInput';
import { ImageCard } from './components/ImageCard';
import { MeasurementEditor } from './components/MeasurementEditor';
import { AiGeneratorModal } from './components/AiGeneratorModal';
import { VtexConfigModal } from './components/VtexConfigModal';
import { extractProductId, fetchProductData } from './services/vtexService';
import { urlToJpgBlob, processLocalFile, downloadBlob, downloadAllAsZip } from './services/imageService';
import { generateImageDescription } from './services/geminiService';
import { uploadImageToVtex } from './services/uploadService';
import { ProductImage, ProcessingStatus, VtexConfig } from './types';
import { 
  Download, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Package, 
  CheckSquare, 
  Square, 
  CloudUpload, 
  CheckCircle, 
  Wand2, 
  Settings, 
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productName, setProductName] = useState<string>('');
  const [currentSkuId, setCurrentSkuId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  
  // VTEX Config State
  const [vtexConfig, setVtexConfig] = useState<VtexConfig | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Modals state
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorRefImage, setGeneratorRefImage] = useState<ProductImage | null>(null);

  // Load VTEX config on mount
  useEffect(() => {
    const saved = localStorage.getItem('vtex_config');
    if (saved) {
      try {
        setVtexConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleFullWidth = () => {
    setIsFullWidth(!isFullWidth);
  };

  const handleSaveVtexConfig = (config: VtexConfig) => {
    setVtexConfig(config);
    localStorage.setItem('vtex_config', JSON.stringify(config));
  };

  const handleSearch = useCallback(async (url: string) => {
    setError(null);
    setImages([]);
    setSelectedIds(new Set());
    setProductName('');
    setStatus(ProcessingStatus.FETCHING_INFO);
    setUploadSuccess(false);

    try {
      const productId = extractProductId(url);
      if (!productId) {
        throw new Error("No se pudo detectar el ID del producto en la URL.");
      }
      
      setCurrentSkuId(productId);

      const data = await fetchProductData(productId);
      setProductName(data.productName);
      setStatus(ProcessingStatus.CONVERTING);
      
      const imagePromises = data.images.map(async (imgUrl): Promise<ProductImage | null> => {
        try {
            const { blob, width, height } = await urlToJpgBlob(imgUrl);
            const objectUrl = URL.createObjectURL(blob);
            return {
                id: crypto.randomUUID(),
                originalUrl: imgUrl,
                blob,
                objectUrl,
                status: 'success' as const,
                width,
                height,
            };
        } catch (e) { return null; }
      });

      const processed = await Promise.all(imagePromises);
      const validImages = processed.filter((img): img is ProductImage => img !== null);
      
      if (validImages.length === 0) throw new Error("No se pudieron procesar las imágenes.");

      setImages(validImages);
      setStatus(ProcessingStatus.COMPLETE);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
      setStatus(ProcessingStatus.ERROR);
    }
  }, []);

  const handleUpload = async (files: FileList) => {
      setError(null);
      setImages([]);
      setSelectedIds(new Set());
      setProductName('Imágenes Subidas');
      setStatus(ProcessingStatus.CONVERTING);
      setUploadSuccess(false);

      try {
          const fileArray = Array.from(files);
          const imagePromises = fileArray.map(async (file): Promise<ProductImage | null> => {
              try {
                  const { blob, width, height } = await processLocalFile(file);
                  const objectUrl = URL.createObjectURL(blob);
                  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                  return {
                      id: crypto.randomUUID(),
                      originalUrl: 'local-file',
                      blob,
                      objectUrl,
                      status: 'success' as const,
                      suggestedName: baseName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
                      width,
                      height,
                  };
              } catch (e) { return null; }
          });

          const processed = await Promise.all(imagePromises);
          const validImages = processed.filter((img): img is ProductImage => img !== null);
          if (validImages.length === 0) throw new Error("Error al procesar archivos.");
          setImages(validImages);
          setStatus(ProcessingStatus.COMPLETE);
      } catch (err: any) {
          setError("Error procesando archivos.");
          setStatus(ProcessingStatus.ERROR);
      }
  };

  const handleUploadToServer = async () => {
    if (!vtexConfig) {
        setIsConfigOpen(true);
        setError("Por favor, configura las credenciales de VTEX primero.");
        return;
    }

    const imagesToUpload = selectedIds.size > 0 ? images.filter(img => selectedIds.has(img.id)) : images;
    if (imagesToUpload.length === 0) return;
    
    setIsUploading(true);
    let successCount = 0;
    let lastErrorMsg = "";

    for (const img of imagesToUpload) {
        const result = await uploadImageToVtex(img, currentSkuId, vtexConfig);
        if (result.success) {
            successCount++;
        } else {
            lastErrorMsg = result.message || "Fallo desconocido";
        }
    }

    setIsUploading(false);
    if (successCount === imagesToUpload.length) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
    } else {
        setError(`Se subieron ${successCount} de ${imagesToUpload.length} imágenes. Error: ${lastErrorMsg}`);
    }
  };

  /**
   * Actualizado: Ahora renombra las fotos siguiendo la convención SKU, SKU_1, SKU_2, etc.
   */
  const handleAnalyzeAll = async () => {
    if (!currentSkuId && !productName) {
      setError("No hay un SKU o nombre de producto disponible para renombrar.");
      return;
    }

    // Usar el SKU como base, si no existe usar el nombre del producto sanitizado
    const baseName = currentSkuId || productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Simular un pequeño delay de procesamiento para feedback visual
    const allIds = new Set(images.map(i => i.id));
    setAnalyzingIds(allIds);
    
    await new Promise(resolve => setTimeout(resolve, 600));

    setImages(prev => prev.map((img, index) => ({
        ...img,
        suggestedName: index === 0 ? baseName : `${baseName}_${index}`
    })));
    
    setAnalyzingIds(new Set());
  };

  const handleAnalyzeSingle = async (image: ProductImage) => {
      setAnalyzingIds(prev => new Set(prev).add(image.id));
      if (image.blob) {
          // Para análisis individual, seguimos usando la IA para obtener una descripción creativa
          const name = await generateImageDescription(image.blob);
          setImages(prev => prev.map(img => img.id === image.id ? { ...img, suggestedName: name } : img));
      }
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(image.id); return next; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.size === images.length ? new Set() : new Set(images.map(i => i.id)));
  };

  const handleSaveEditedImage = (newBlob: Blob) => {
    if (!editingImage) return;
    if (editingImage.objectUrl) URL.revokeObjectURL(editingImage.objectUrl);
    const newUrl = URL.createObjectURL(newBlob);
    setImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, blob: newBlob, objectUrl: newUrl } : img));
    setEditingImage(null);
  };

  const handleAddAiImageToGallery = (blob: Blob, prompt: string, width?: number, height?: number) => {
    const id = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(blob);
    const name = prompt.substring(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newImage: ProductImage = {
        id,
        originalUrl: 'ai-generated',
        blob,
        objectUrl,
        status: 'success',
        suggestedName: `ai-${name}`,
        width: width || 1024,
        height: height || 1024
    };
    setImages(prev => [newImage, ...prev]);
    setIsGeneratorOpen(false);
    setGeneratorRefImage(null);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-elegant-red opacity-5 transform -skew-y-6 -translate-y-24"></div>
      </div>

      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 transition-all">
        <div className={`${isFullWidth ? 'max-w-full px-8' : 'max-w-7xl mx-auto px-6'} h-20 flex items-center justify-between transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 rounded-xl p-2 shadow-lg shadow-brand-200">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 leading-none">Oechsle <span className="text-brand-600">Pro</span></h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-1">Image Extraction Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Powered by</span>
              <span className="text-xs font-black text-brand-600 italic">Gemini 2.5 AI</span>
            </div>
            
            <button 
                onClick={toggleFullWidth}
                className={`p-2.5 rounded-xl transition-all border ${isFullWidth ? 'text-brand-600 bg-brand-50 border-brand-200' : 'text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100 hover:text-gray-900'}`}
                title={isFullWidth ? "Reducir Ancho" : "Maximizar Ancho (Modo Teatral)"}
            >
                {isFullWidth ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            <button 
                onClick={() => setIsConfigOpen(true)}
                className={`p-2.5 rounded-xl transition-all border ${vtexConfig ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                title="Configuración VTEX"
            >
                <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className={`relative z-10 transition-all duration-500 ${isFullWidth ? 'max-w-full px-8' : 'max-w-7xl mx-auto px-6'} py-12 lg:py-20`}>
        {/* Hero Section */}
        <div className="text-center mb-16 lg:mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            NUEVA VERSIÓN ISOMÉTRICA CON IA
          </div>
          <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight text-gray-900 leading-[1.1]">
            Catálogo <span className="text-brand-600">OE</span> <br/>
            Perfecto en segundos
          </h2>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Extrae de Oechsle, analiza con IA y sube directamente a VTEX con un flujo de trabajo elegante y profesional.
          </p>
          
          <div className={`${isFullWidth ? 'max-w-5xl' : 'max-w-3xl'} mx-auto bg-white p-2 rounded-2xl shadow-2xl shadow-brand-100/50 border border-gray-100 transition-all duration-500`}>
            <UrlInput 
              onSearch={handleSearch} 
              onUpload={handleUpload} 
              isLoading={status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETE && status !== ProcessingStatus.ERROR} 
            />
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-10 p-5 bg-white border-l-4 border-brand-600 rounded-xl shadow-xl shadow-red-50 flex items-start gap-4 animate-fade-in">
            <div className="bg-brand-50 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Error en el proceso</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="max-w-2xl mx-auto mb-10 p-5 bg-white border-l-4 border-green-600 rounded-xl shadow-xl shadow-green-50 flex items-start gap-4 animate-fade-in">
            <div className="bg-green-50 p-2 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Transmisión Exitosa</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">Las imágenes seleccionadas han sido enviadas correctamente al SKU de VTEX.</p>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="animate-fade-in space-y-10">
            {/* Action Bar */}
            <div className="bg-gray-900 text-white rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl shadow-gray-200">
              <div className="flex flex-col items-center lg:items-start">
                <h3 className="text-xl font-bold line-clamp-1 flex items-center gap-3">
                  {productName || 'Imágenes Procesadas'}
                  <ArrowRight className="w-5 h-5 text-brand-500" />
                </h3>
                <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3 mt-2">
                    <span className="text-xs font-bold px-3 py-1 bg-white/10 rounded-full border border-white/10 uppercase tracking-widest">{images.length} Archivos</span>
                    {currentSkuId && <span className="text-xs font-bold px-3 py-1 bg-brand-600 rounded-full border border-brand-400 uppercase tracking-widest">SKU: {currentSkuId}</span>}
                    {selectedIds.size > 0 && <span className="text-xs font-bold px-3 py-1 bg-white text-gray-900 rounded-full border border-white uppercase tracking-widest">{selectedIds.size} Selección</span>}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center">
                 <button onClick={selectAll} className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">
                    {selectedIds.size === images.length ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    {selectedIds.size === images.length ? 'Ninguna' : 'Todas'}
                 </button>

                 <button
                    onClick={() => setIsGeneratorOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 text-white hover:bg-brand-500 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-lg shadow-brand-900/40"
                >
                    <Wand2 className="w-4 h-4" />
                    Generar IA
                </button>

                 <button onClick={handleAnalyzeAll} disabled={analyzingIds.size > 0} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold transition-all text-xs uppercase tracking-widest disabled:opacity-50">
                  {analyzingIds.size > 0 ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                  Nombres IA
                </button>

                <button 
                    onClick={handleUploadToServer} 
                    disabled={isUploading || !currentSkuId} 
                    className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-bold transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CloudUpload className="w-4 h-4" />}
                    Subir VTEX
                </button>
                
                <button onClick={selectedIds.size > 0 ? (async () => {
                    const selected = images.filter(img => selectedIds.has(img.id));
                    await downloadAllAsZip(selected, productName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_seleccion');
                }) : (async () => {
                    await downloadAllAsZip(images, productName.replace(/[^a-z0-9]/gi, '_').toLowerCase());
                })} className="inline-flex items-center gap-2 px-5 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">
                    <Download className="w-4 h-4" />
                    Descargar ZIP
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFullWidth ? 'lg:grid-cols-4 xl:grid-cols-5' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-8 transition-all duration-500`}>
              {images.map((img) => (
                <ImageCard 
                    key={img.id} 
                    image={img} 
                    selected={selectedIds.has(img.id)}
                    onToggleSelect={() => toggleSelect(img.id)}
                    onDownload={(image) => {
                        if (image.blob) {
                            const name = image.suggestedName ? `${image.suggestedName}.jpg` : `oechsle-${image.id.substring(0,4)}.jpg`;
                            downloadBlob(image.blob, name);
                        }
                    }}
                    onAnalyze={handleAnalyzeSingle}
                    onEdit={(i) => setEditingImage(i)}
                    onGenerateFrom={(i) => { setGeneratorRefImage(i); setIsGeneratorOpen(true); }}
                    isAnalyzing={analyzingIds.has(img.id)}
                />
              ))}
            </div>
          </div>
        )}

        {status !== ProcessingStatus.IDLE && images.length === 0 && !error && (
            <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
                 <div className="relative mx-auto w-24 h-24 mb-8">
                   <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping opacity-25"></div>
                   <div className="relative z-10 w-full h-full bg-brand-50 rounded-full flex items-center justify-center border border-brand-100">
                      <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
                   </div>
                 </div>
                 <h3 className="text-2xl font-black text-gray-900">Procesando Producto</h3>
                 <p className="text-gray-500 mt-4 font-medium leading-relaxed">
                   {status === ProcessingStatus.FETCHING_INFO ? "Analizando el servidor VTEX para recuperar metadatos del SKU..." : "Transformando archivos al estándar profesional JPG (80% calidad)..."}
                 </p>
            </div>
        )}
      </main>

      {/* Modals */}
      {editingImage && (
        <MeasurementEditor 
          image={editingImage} 
          onClose={() => setEditingImage(null)} 
          onSave={handleSaveEditedImage} 
        />
      )}
      {isGeneratorOpen && (
        <AiGeneratorModal 
            referenceImage={generatorRefImage} 
            onClose={() => { setIsGeneratorOpen(false); setGeneratorRefImage(null); }} 
            onAddToGallery={handleAddAiImageToGallery}
        />
      )}
      {isConfigOpen && (
          <VtexConfigModal 
            initialConfig={vtexConfig} 
            onClose={() => setIsConfigOpen(false)} 
            onSave={handleSaveVtexConfig} 
          />
      )}
    </div>
  );
}
