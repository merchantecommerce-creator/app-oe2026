
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { ProductImage } from '../types';

const PROXIES = [
  // 1. Modern wsrv.nl - Most reliable for Oechsle's high-res images
  (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&n=-1`,
  
  // 2. Cloudflare-based proxy (High bandwidth)
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  
  // 3. Legacy weserv
  (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&output=jpg`,
  
  // 4. AllOrigins (Dynamic raw fetch)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&cb=${Date.now()}`
];

const fetchImageBlob = async (src: string): Promise<Blob> => {
  console.log(`[ImageService] Fetching: ${src}`);
  
  // 1. Try Direct Fetch (Sometimes works for VTEX static domains)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(src, { 
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
        signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    }
  } catch (error: any) {}

  // 2. Try Proxies
  let lastError: any;
  for (let i = 0; i < PROXIES.length; i++) {
    try {
      const proxiedUrl = PROXIES[i](src);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s for high-res images
      
      const response = await fetch(proxiedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) continue; 
        
        const blob = await response.blob();
        if (blob.size > 1000) return blob;
      }
    } catch (error: any) {
      lastError = error;
    }
  }
  
  throw lastError || new Error(`Error de red al obtener: ${src}`);
};

const blobToImage = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (blob.type.includes('text/html')) {
        return reject(new Error("Formato de imagen inválido"));
    }
    
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.crossOrigin = "anonymous"; 
    
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error("Error al procesar los píxeles de la imagen"));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
};

export const resizeBlob = async (sourceBlob: Blob, width: number, height: number): Promise<Blob> => {
    const img = await blobToImage(sourceBlob);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context error");
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
    });
};

export const convertBlobToJpg = async (sourceBlob: Blob): Promise<{ blob: Blob, width: number, height: number }> => {
    const img = await blobToImage(sourceBlob);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context error");
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, width: canvas.width, height: canvas.height });
        else reject(new Error("Blob conversion error"));
      }, 'image/jpeg', 0.95);
    });
};

export const urlToJpgBlob = async (url: string): Promise<{ blob: Blob, width: number, height: number }> => {
  const originalBlob = await fetchImageBlob(url);
  return await convertBlobToJpg(originalBlob);
};

export const processLocalFile = async (file: File): Promise<{ blob: Blob, width: number, height: number }> => {
    return await convertBlobToJpg(file);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAllAsZip = async (images: ProductImage[], zipName: string) => {
  const zip = new JSZip();
  const folder = zip.folder("images");
  images.forEach((img, index) => {
    if (img.blob) {
      const name = img.suggestedName ? `${img.suggestedName}.jpg` : `image-${index + 1}.jpg`;
      folder?.file(name, img.blob);
    }
  });
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${zipName}.zip`);
};
