import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClose: () => void;
  currentSignature?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose, currentSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setContext(ctx);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Si hay firma existente, cargarla
        if (currentSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = currentSignature;
        }
      }
    }
  }, [currentSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-signature text-white text-xl"></i>
              </div>
              <h2 className="text-white text-xl font-bold">Firma Digital</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-6">
          <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <i className="fa-solid fa-info-circle text-blue-600 mr-2"></i>
            Dibuja tu firma con el mouse o dedo en el área a continuación
          </div>
          
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white mb-6 shadow-inner">
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={clearCanvas}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-eraser"></i>
              Borrar
            </button>
            <button
              onClick={saveSignature}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 shadow-lg"
            >
              <i className="fa-solid fa-check"></i>
              Guardar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
