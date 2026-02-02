
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Save, ArrowLeftRight, ArrowUpDown, Box, CheckCircle2 } from 'lucide-react';
import { ProductImage } from '../types';

interface MeasurementEditorProps {
  image: ProductImage;
  onSave: (newBlob: Blob) => void;
  onClose: () => void;
}

type MeasurementType = 'width' | 'height' | 'depth';

interface Point {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

interface Measurement {
  active: boolean;
  value: string;
  start: Point;
  end: Point;
  color: string;
  label: string;
}

export const MeasurementEditor: React.FC<MeasurementEditorProps> = ({ image, onSave, onClose }) => {
  const [measurements, setMeasurements] = useState<Record<MeasurementType, Measurement>>({
    width: { 
      active: false, 
      value: '', 
      start: { x: 20, y: 90 }, 
      end: { x: 80, y: 90 }, 
      color: '#000000', // Black
      label: 'Ancho'
    },
    height: { 
      active: false, 
      value: '', 
      start: { x: 10, y: 20 }, 
      end: { x: 10, y: 80 }, 
      color: '#000000', // Black
      label: 'Alto'
    },
    depth: { 
      active: false, 
      value: '', 
      start: { x: 70, y: 70 }, 
      end: { x: 90, y: 85 }, 
      color: '#000000', // Black
      label: 'Largo'
    }
  });

  const [imageUrl, setImageUrl] = useState<string>('');
  const [activeDrag, setActiveDrag] = useState<{ type: MeasurementType, point: 'start' | 'end' | 'line' } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load image
  useEffect(() => {
    if (image.blob) {
      const url = URL.createObjectURL(image.blob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (image.objectUrl) {
      setImageUrl(image.objectUrl);
    }
  }, [image]);

  const toggleMeasurement = (type: MeasurementType) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: { ...prev[type], active: !prev[type].active }
    }));
  };

  const updateValue = (type: MeasurementType, val: string) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: { ...prev[type], value: val }
    }));
  };

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent, type: MeasurementType, point: 'start' | 'end' | 'line') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (point === 'line' && containerRef.current) {
        // Calculate offset from the click to the line center (or start point) to maintain relative position
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;
        
        const m = measurements[type];
        // We store the difference between click and start point
        setDragOffset({
            x: clickX - m.start.x,
            y: clickY - m.start.y
        });
    }
    
    setActiveDrag({ type, point });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeDrag || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    // Helper to clamp values 0-100
    const clamp = (val: number) => Math.max(0, Math.min(100, val));

    if (activeDrag.point === 'line' && dragOffset) {
        setMeasurements(prev => {
            const m = prev[activeDrag.type];
            // Calculate delta movement based on start point
            const newStartX = clamp(currentX - dragOffset.x);
            const newStartY = clamp(currentY - dragOffset.y);
            
            // Maintain length and angle
            const dx = m.end.x - m.start.x;
            const dy = m.end.y - m.start.y;
            
            const newEndX = clamp(newStartX + dx);
            const newEndY = clamp(newStartY + dy);
            
            // Re-adjust start if end hit a wall to prevent shrinking
            const finalStartX = clamp(newEndX - dx);
            const finalStartY = clamp(newEndY - dy);

            return {
                ...prev,
                [activeDrag.type]: {
                    ...m,
                    start: { x: finalStartX, y: finalStartY },
                    end: { x: newEndX, y: newEndY }
                }
            };
        });
        return;
    }

    // Handle Start/End point dragging with Snapping
    let clampedX = clamp(currentX);
    let clampedY = clamp(currentY);

    setMeasurements(prev => {
        const currentMeas = prev[activeDrag.type];
        const otherPoint = activeDrag.point === 'start' ? currentMeas.end : currentMeas.start;

        // Threshold for snapping (in percentage)
        const SNAP_THRESHOLD = 1.5;

        // Check horizontal snap (align Y)
        if (Math.abs(clampedY - otherPoint.y) < SNAP_THRESHOLD) {
            clampedY = otherPoint.y;
        }

        // Check vertical snap (align X)
        if (Math.abs(clampedX - otherPoint.x) < SNAP_THRESHOLD) {
            clampedX = otherPoint.x;
        }

        return {
            ...prev,
            [activeDrag.type]: {
                ...prev[activeDrag.type],
                [activeDrag.point]: { x: clampedX, y: clampedY }
            }
        };
    });
  }, [activeDrag, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setActiveDrag(null);
    setDragOffset(null);
  }, []);

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, handleMouseMove, handleMouseUp]);

  // Canvas Export Logic
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error("No canvas context");

      // 1. Draw Image
      ctx.drawImage(img, 0, 0);

      // 2. Draw Measurements
      // Scale factor for text and lines based on image size
      const scale = Math.max(canvas.width, canvas.height) / 1000;
      const lineWidth = 1.5 * scale; // Thinner lines (was 3)
      const fontSize = 24 * scale;
      const arrowHeadLength = 12 * scale; // Slightly smaller arrowheads

      ctx.lineWidth = lineWidth;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      (Object.keys(measurements) as MeasurementType[]).forEach(key => {
        const m = measurements[key];
        if (!m.active) return;

        const x1 = (m.start.x / 100) * canvas.width;
        const y1 = (m.start.y / 100) * canvas.height;
        const x2 = (m.end.x / 100) * canvas.width;
        const y2 = (m.end.y / 100) * canvas.height;

        // Calculate Angle for Arrowheads
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = m.color;
        ctx.fillStyle = m.color;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw Arrowhead at END
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowHeadLength * Math.cos(angle - Math.PI / 6), y2 - arrowHeadLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - arrowHeadLength * Math.cos(angle + Math.PI / 6), y2 - arrowHeadLength * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        // Draw Arrowhead at START (Reverse angle)
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrowHeadLength * Math.cos(angle - Math.PI / 6), y1 + arrowHeadLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x1 + arrowHeadLength * Math.cos(angle + Math.PI / 6), y1 + arrowHeadLength * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        // Draw Label Background & Text
        if (m.value) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const text = m.value;
          const textMetrics = ctx.measureText(text);
          const padding = 10 * scale;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(
            midX - textMetrics.width / 2 - padding / 2,
            midY - fontSize / 2 - padding / 2,
            textMetrics.width + padding,
            fontSize + padding
          );

          ctx.fillStyle = m.color;
          ctx.fillText(text, midX, midY);
        }
      });

      // 3. Export to Blob
      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
        setIsSaving(false);
      }, 'image/jpeg', 0.95);

    } catch (e) {
      console.error("Failed to save measurements", e);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden animate-fade-in">
        
        {/* Editor Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center min-h-0">
            {imageUrl ? (
              <div 
                ref={containerRef} 
                className="relative select-none shadow-lg max-h-full max-w-full"
                style={{ touchAction: 'none' }}
              >
                  {/* Base Image */}
                  <img src={imageUrl} alt="Edit" className="max-h-[85vh] max-w-full object-contain pointer-events-none" />

                  {/* Interactive Overlays */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                      <defs>
                          <marker id="arrowhead-end" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                              <polygon points="0 0, 6 3, 0 6" fill="#000000" />
                          </marker>
                          <marker id="arrowhead-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
                              <polygon points="6 0, 0 3, 6 6" fill="#000000" />
                          </marker>
                      </defs>

                      {(Object.keys(measurements) as MeasurementType[]).map(key => {
                          const m = measurements[key];
                          if (!m.active) return null;

                          const isHorizontal = Math.abs(m.start.y - m.end.y) < 0.1;
                          const isVertical = Math.abs(m.start.x - m.end.x) < 0.1;
                          const isStraight = isHorizontal || isVertical;

                          return (
                              <React.Fragment key={key}>
                                  {/* Guide Lines when straight */}
                                  {isStraight && (
                                      <line 
                                          x1={isVertical ? `${m.start.x}%` : '0%'} 
                                          y1={isHorizontal ? `${m.start.y}%` : '0%'} 
                                          x2={isVertical ? `${m.end.x}%` : '100%'} 
                                          y2={isHorizontal ? `${m.end.y}%` : '100%'} 
                                          stroke="green" 
                                          strokeWidth="1"
                                          strokeDasharray="4 2"
                                          opacity="0.4"
                                      />
                                  )}

                                  {/* Main Measurement Line with Arrows */}
                                  <line 
                                    x1={`${m.start.x}%`} 
                                    y1={`${m.start.y}%`} 
                                    x2={`${m.end.x}%`} 
                                    y2={`${m.end.y}%`} 
                                    stroke={m.color} 
                                    strokeWidth="1.5"
                                    markerStart="url(#arrowhead-start)"
                                    markerEnd="url(#arrowhead-end)"
                                  />
                              </React.Fragment>
                          );
                      })}
                  </svg>

                  {/* DOM Elements for interactivity (Handles, Labels, Hit Areas) */}
                  {(Object.keys(measurements) as MeasurementType[]).map(key => {
                    const m = measurements[key];
                    if (!m.active) return null;
                    const isHorizontal = Math.abs(m.start.y - m.end.y) < 0.1;
                    const isVertical = Math.abs(m.start.x - m.end.x) < 0.1;
                    const isStraight = isHorizontal || isVertical;

                    return (
                      <React.Fragment key={`controls-${key}`}>
                        {/* Text Label */}
                        {m.value && (
                           <div 
                              onMouseDown={(e) => handleMouseDown(e, key, 'line')}
                              className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/90 px-2 py-1 rounded text-sm font-bold shadow-sm cursor-move z-20 whitespace-nowrap hover:bg-gray-50 border border-transparent hover:border-gray-200"
                              style={{ 
                                left: `${(m.start.x + m.end.x) / 2}%`, 
                                top: `${(m.start.y + m.end.y) / 2}%`,
                                color: m.color
                              }}
                           >
                             {m.value}
                           </div>
                        )}
                        
                        {/* Invisible thicker line for dragging */}
                        <div 
                             className="absolute z-10 cursor-move"
                             style={{
                                 left: 0, top: 0, width: '100%', height: '100%',
                                 pointerEvents: 'none'
                             }}
                        >
                            <svg width="100%" height="100%" style={{pointerEvents: 'fill'}}>
                                <line 
                                    x1={`${m.start.x}%`} 
                                    y1={`${m.start.y}%`} 
                                    x2={`${m.end.x}%`} 
                                    y2={`${m.end.y}%`} 
                                    stroke="transparent" 
                                    strokeWidth="20"
                                    onMouseDown={(e) => handleMouseDown(e, key, 'line')}
                                    style={{ cursor: 'move', pointerEvents: 'stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Straight Indicator Badge */}
                        {isStraight && (
                            <div 
                              className="absolute transform -translate-x-1/2 -translate-y-full mb-4 bg-green-100 border border-green-200 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm pointer-events-none z-30 flex items-center gap-1"
                              style={{ 
                                left: `${(m.start.x + m.end.x) / 2}%`, 
                                top: `${(m.start.y + m.end.y) / 2}%`
                              }}
                           >
                             <CheckCircle2 className="w-3 h-3" />
                             RECTO
                           </div>
                        )}

                        {/* Draggable Endpoints */}
                        {['start', 'end'].map((point) => (
                           <div
                              key={`${key}-${point}`}
                              onMouseDown={(e) => handleMouseDown(e, key, point as 'start' | 'end')}
                              className={`absolute w-4 h-4 rounded-full shadow-sm cursor-move z-30 hover:scale-125 transition-transform flex items-center justify-center border`}
                              style={{
                                left: `${m[point as 'start' | 'end'].x}%`,
                                top: `${m[point as 'start' | 'end'].y}%`,
                                transform: 'translate(-50%, -50%)',
                                borderColor: isStraight ? '#22c55e' : 'rgba(0,0,0,0.3)',
                                backgroundColor: '#ffffff'
                              }}
                           >
                              <div className={`w-1.5 h-1.5 rounded-full ${isStraight ? 'bg-green-500' : 'bg-gray-400'}`} />
                           </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
              </div>
            ) : (
               <div className="text-gray-400">Cargando imagen...</div>
            )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col z-20 shadow-xl">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Editor de Medidas</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
               <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded text-center">
              Activa una medida y arrastra los círculos sobre la imagen. 
              <span className="block mt-1 font-medium text-blue-700">La línea se alineará automáticamente si está casi recta.</span>
            </p>

            {/* Ancho Control */}
            <div className={`border rounded-lg p-3 transition-colors ${measurements.width.active ? 'border-brand-500 bg-brand-50/30' : 'border-gray-200'}`}>
               <div className="flex items-center gap-3 mb-2">
                  <input 
                    type="checkbox" 
                    checked={measurements.width.active} 
                    onChange={() => toggleMeasurement('width')}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <ArrowLeftRight className="w-4 h-4 text-brand-500" />
                  <span className="font-medium text-sm text-gray-700">Ancho</span>
               </div>
               {measurements.width.active && (
                 <input 
                    type="text" 
                    placeholder="Ej: 120 cm"
                    value={measurements.width.value}
                    onChange={(e) => updateValue('width', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    autoFocus
                 />
               )}
            </div>

            {/* Alto Control */}
            <div className={`border rounded-lg p-3 transition-colors ${measurements.height.active ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
               <div className="flex items-center gap-3 mb-2">
                  <input 
                    type="checkbox" 
                    checked={measurements.height.active} 
                    onChange={() => toggleMeasurement('height')}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <ArrowUpDown className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm text-gray-700">Alto</span>
               </div>
               {measurements.height.active && (
                 <input 
                    type="text" 
                    placeholder="Ej: 85 cm"
                    value={measurements.height.value}
                    onChange={(e) => updateValue('height', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                 />
               )}
            </div>

            {/* Largo Control */}
            <div className={`border rounded-lg p-3 transition-colors ${measurements.depth.active ? 'border-green-500 bg-green-50/30' : 'border-gray-200'}`}>
               <div className="flex items-center gap-3 mb-2">
                  <input 
                    type="checkbox" 
                    checked={measurements.depth.active} 
                    onChange={() => toggleMeasurement('depth')}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <Box className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm text-gray-700">Largo / Fondo</span>
               </div>
               {measurements.depth.active && (
                 <input 
                    type="text" 
                    placeholder="Ej: 40 cm"
                    value={measurements.depth.value}
                    onChange={(e) => updateValue('depth', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                 />
               )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-lg shadow-gray-200"
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Imagen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
