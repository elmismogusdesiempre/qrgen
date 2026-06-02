"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Upload, Download, Copy, X, Link2, Palette, Image as ImageIcon, 
  Check, AlertCircle, RefreshCw 
} from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

export default function QRGenerator() {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoFileName, setLogoFileName] = useState('');
  const [fgColor, setFgColor] = useState('#111111');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [logoSize, setLogoSize] = useState(0.18);
  
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Validate URL
  const validateUrl = useCallback((value: string): boolean => {
    if (!value.trim()) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  };

  // Draw QR code to any canvas (used for both preview and downloads)
  const drawToCanvas = useCallback(async (
    canvas: HTMLCanvasElement, 
    targetSize: number
  ): Promise<void> => {
    if (!url || !isValidUrl) {
      const ctx = canvas.getContext('2d')!;
      canvas.width = targetSize;
      canvas.height = targetSize;
      ctx.fillStyle = '#e8edf5';
      ctx.fillRect(0, 0, targetSize, targetSize);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // 1. Generate base QR code (high error correction for logo overlay)
    const offscreen = document.createElement('canvas');
    await QRCode.toCanvas(offscreen, url, {
      width: targetSize,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: 'H',
    });

    // 2. Draw the QR
    ctx.drawImage(offscreen, 0, 0, targetSize, targetSize);

    // 3. Overlay logo if present (centered, with white backing circle)
    if (logoImage) {
      const logoWidth = Math.floor(targetSize * logoSize);
      const logoX = Math.floor((targetSize - logoWidth) / 2);
      const logoY = logoX;
      const center = targetSize / 2;
      const radius = Math.floor(logoWidth / 2 + logoWidth * 0.13);

      // White circular backing (ensures scannability)
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw logo with circular mask (premium look)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, logoWidth / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoWidth);
      ctx.restore();
    }
  }, [url, isValidUrl, fgColor, bgColor, logoImage, logoSize]);

  // Live preview with debounce
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      drawToCanvas(canvas, 420).catch(console.error);
    }, 140);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url, fgColor, bgColor, logoImage, logoSize, isValidUrl, drawToCanvas]);

  // URL change handler
  const handleUrlChange = (value: string) => {
    setUrl(value);
    const valid = validateUrl(value);
    setIsValidUrl(valid);
  };

  // Load logo from file
  const loadLogo = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Selecciona un archivo de imagen (PNG, JPG o WEBP)', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('El logo debe pesar menos de 2 MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setLogoImage(img);
        setLogoFileName(file.name);
        showToast('Logo cargado correctamente');
      };
      img.onerror = () => {
        showToast('No se pudo cargar la imagen', 'error');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadLogo(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadLogo(file);
  };

  // Remove logo
  const removeLogo = () => {
    setLogoImage(null);
    setLogoFileName('');
    showToast('Logo eliminado');
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Generate high-res canvas for export
  const generateExportCanvas = async (size: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    await drawToCanvas(canvas, size);
    return canvas;
  };

  // Download PNG
  const handleDownload = async (size: number) => {
    if (!url || !isValidUrl) {
      showToast('Ingresa una URL válida primero', 'error');
      return;
    }

    try {
      const canvas = await generateExportCanvas(size);
      const link = document.createElement('a');
      
      // Create safe filename from URL
      const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
      const safeName = domain.replace(/[^\w.-]/g, '-').slice(0, 50) || 'qr';
      
      link.download = `qr-${safeName}-${size}px.png`;
      link.href = canvas.toDataURL('image/png', 1);
      link.click();
      
      showToast(`Descargado ${size}×${size} px`);
    } catch (error) {
      showToast('Error al generar la imagen', 'error');
    }
  };

  // Copy image to clipboard
  const handleCopy = async () => {
    if (!url || !isValidUrl) {
      showToast('Ingresa una URL válida primero', 'error');
      return;
    }

    try {
      const canvas = await generateExportCanvas(1024);
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) throw new Error('No se pudo generar la imagen');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      showToast('Imagen copiada al portapapeles');
    } catch (error) {
      showToast('No se pudo copiar. Usa el botón Descargar', 'error');
    }
  };

  // Load example URL
  const loadExample = () => {
    const example = 'https://vercel.com';
    setUrl(example);
    setIsValidUrl(true);
  };

  // Reset everything
  const resetAll = () => {
    setUrl('');
    setIsValidUrl(false);
    setLogoImage(null);
    setLogoFileName('');
    setFgColor('#111111');
    setBgColor('#ffffff');
    setLogoSize(0.18);
    showToast('Todo restablecido');
  };

  // Auto-prepend https:// on blur if user typed a domain without protocol
  const handleUrlBlur = () => {
    if (url && !/^https?:\/\//i.test(url)) {
      // Only if it looks like a domain
      if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(url.trim())) {
        const fixed = 'https://' + url.trim();
        setUrl(fixed);
        setIsValidUrl(true);
      }
    }
  };

  return (
    <div className="min-h-screen text-[#171717]">
      {/* Soft pastel mesh background (newtech cool tones) */}
      <div className="mesh-background" />

      {/* Minimal header */}
      <header className="border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#9cade6' }}>
              <span className="text-[#1e2937] font-semibold text-xl tracking-tighter">QR</span>
            </div>
            <div>
              <div className="font-semibold tracking-tight text-xl">QR con Logo</div>
              <div className="text-[10px] text-[#64748b] -mt-1">PERMANENTE • PRIVADO</div>
            </div>
          </div>
          <button 
            onClick={resetAll}
            className="flex items-center gap-2 text-sm text-[#52525b] hover:text-black transition-colors px-4 py-2 rounded-full hover:bg-zinc-100"
          >
            <RefreshCw size={15} />
            <span>Reiniciar</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter mb-3">
            Genera códigos QR<br />con tu logo
          </h1>
          <p className="text-xl text-[#52525b] max-w-md mx-auto">
            Directos a tu URL. Nunca expiran. Todo se genera en tu navegador.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* FORM */}
          <div className="space-y-6">
            {/* URL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label flex items-center gap-2">
                  <Link2 size={15} /> URL de destino
                </label>
                <button 
                  onClick={loadExample}
                  className="text-xs text-[#52525b] hover:text-black underline underline-offset-2"
                >
                  Usar ejemplo
                </button>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://tuempresa.com"
                className={`input text-base ${!isValidUrl && url ? 'error' : ''}`}
              />
              {!isValidUrl && url && (
                <p className="mt-1.5 text-xs text-[#dc2626] flex items-center gap-1">
                  <AlertCircle size={13} /> Ingresa una URL válida con http:// o https://
                </p>
              )}
              <p className="mt-2 text-xs text-[#52525b]">
                El código QR apunta directamente aquí. Sin intermediarios ni vencimiento.
              </p>
            </div>

            {/* LOGO UPLOAD */}
            <div>
              <label className="label flex items-center gap-2 mb-2">
                <ImageIcon size={15} /> Logo de tu empresa <span className="font-normal text-[#a1a1aa]">(opcional)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!logoImage ? (
                <div
                  onClick={openFilePicker}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`dropzone ${isDragging ? 'dragover' : ''}`}
                >
                  <div className="mx-auto w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                    <Upload size={20} className="text-[#52525b]" />
                  </div>
                  <p className="font-medium mb-0.5">Arrastra tu logo aquí</p>
                  <p className="text-sm text-[#52525b]">o haz clic para seleccionar</p>
                  <p className="text-[11px] mt-3 text-[#a1a1aa]">PNG, JPG o WEBP • Máx. 2 MB • Recomendado: fondo transparente</p>
                </div>
              ) : (
                <div className="dropzone-logo">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#e4e4e7] flex-shrink-0 bg-white">
                    <img 
                      src={logoImage.src} 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{logoFileName}</div>
                    <div className="text-xs text-[#16a34a] flex items-center gap-1 mt-0.5">
                      <Check size={13} /> Listo para usar
                    </div>
                  </div>
                  <button
                    onClick={removeLogo}
                    className="p-2 text-[#52525b] hover:text-[#dc2626] hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Eliminar logo"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              <div className="info-box mt-3">
                Para máxima fiabilidad al escanear, el logo ocupa el 18% del centro y tiene un borde blanco.
              </div>
            </div>

            {/* CUSTOMIZATION */}
            <div className="space-y-5 pt-1">
              <div>
                <label className="label flex items-center gap-2">
                  <Palette size={15} /> Personalización
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* QR Color */}
                  <div className="color-picker">
                    <div className="flex-1">
                      <div className="text-xs text-[#52525b] mb-0.5">Color del QR</div>
                      <div className="font-mono text-sm">{fgColor}</div>
                    </div>
                    <input 
                      type="color" 
                      value={fgColor} 
                      onChange={(e) => setFgColor(e.target.value)}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* BG Color */}
                  <div className="color-picker">
                    <div className="flex-1">
                      <div className="text-xs text-[#52525b] mb-0.5">Fondo</div>
                      <div className="font-mono text-sm">{bgColor}</div>
                    </div>
                    <input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Size Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="label mb-0">Tamaño del logo</div>
                  <div className="font-mono text-sm tabular-nums text-[#52525b]">
                    {Math.round(logoSize * 100)}%
                  </div>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.26"
                  step="0.01"
                  value={logoSize}
                  onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                  className="slider w-full accent-black"
                />
                <div className="flex justify-between text-[10px] text-[#a1a1aa] mt-1 px-0.5">
                  <div>Más escaneable</div>
                  <div>Más visible</div>
                </div>
              </div>
            </div>

            <button 
              onClick={resetAll}
              className="text-xs text-[#52525b] hover:text-black flex items-center gap-1.5 mt-1"
            >
              <RefreshCw size={13} /> Restablecer todo
            </button>
          </div>

          {/* PREVIEW + ACTIONS */}
          <div className="lg:sticky lg:top-20 self-start">
            <div className="preview-card p-6 md:p-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <div className="font-semibold tracking-tight">Vista previa</div>
                  <div className="text-xs text-[#52525b]">Actualiza en tiempo real</div>
                </div>
                {url && isValidUrl && (
                  <div className="text-[10px] px-3 py-1 rounded-full bg-[#e0e7ff] text-[#475569] font-medium">
                    NIVEL H • SEGURO
                  </div>
                )}
              </div>

              {/* Canvas Preview */}
              <div className="canvas-container mb-6">
                <canvas 
                  ref={previewCanvasRef} 
                  className="rounded-xl shadow-sm max-w-full" 
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {!url || !isValidUrl ? (
                <div className="text-center py-2 text-sm text-[#52525b]">
                  Escribe una URL para generar el código QR
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="text-sm font-medium mb-0.5 truncate text-[#171717]">
                    {url}
                  </div>
                  <div className="text-[11px] text-[#16a34a] flex items-center justify-center gap-1">
                    <Check size={13} /> Este código nunca expira
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-7 space-y-2.5">
                <button
                  onClick={() => handleDownload(1024)}
                  disabled={!url || !isValidUrl}
                  className="btn btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={17} />
                  Descargar PNG (1024 × 1024)
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleDownload(2048)}
                    disabled={!url || !isValidUrl}
                    className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    HD (2048px)
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!url || !isValidUrl}
                    className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy size={16} />
                    Copiar imagen
                  </button>
                </div>
              </div>
            </div>

            {/* Trust / Info */}
            <div className="mt-4 px-2 text-[12px] text-[#52525b] leading-snug">
              Todo se procesa en tu navegador. Tu URL y logo nunca salen de tu dispositivo. 
              Compatible con todos los lectores de QR.
            </div>
          </div>
        </div>

        {/* Bottom tips */}
        <div className="mt-14 max-w-2xl mx-auto">
          <div className="text-center text-xs text-[#52525b] space-y-1">
            <p><strong>Consejo:</strong> Usa logos simples con alto contraste. Evita fotos complejas.</p>
            <p>Para impresión, descarga en 2048px. Para redes sociales, 1024px es perfecto.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e4e4e7] py-8 text-center text-xs text-[#52525b]">
        <div className="max-w-5xl mx-auto px-6">
          Hecho para uso libre •{' '}
          <a 
            href="https://vercel.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-black"
          >
            Despliégalo gratis en Vercel
          </a>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="toast">
          {toast.type === 'success' ? (
            <Check size={16} className="text-[#16a34a]" />
          ) : (
            <AlertCircle size={16} className="text-[#f87171]" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
