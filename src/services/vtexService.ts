
import { ExtractionResult } from '../types';

// Enhanced Proxy List for better reliability
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
];

export const extractProductId = (url: string): string | null => {
  if (!url) return null;
  let cleanUrl = url.trim();

  try {
    cleanUrl = decodeURIComponent(cleanUrl);
  } catch (e) {}

  try {
    // Priority 0: Standard VTEX pattern ending in /p
    // Captures slugs like 'televisor-samsung-50--qn50q7faagxpe-qled-tizen-8-0-2894317'
    const slugMatch = cleanUrl.match(/\/([^/]+)\/p(?:[/?#]|$)/i);
    if (slugMatch && slugMatch[1]) {
        // Check if the slug itself ends with a numeric ID (very common)
        const numericSuffix = slugMatch[1].match(/-(\d+)$/);
        if (numericSuffix && numericSuffix[1]) {
            return numericSuffix[1]; // Return the numeric ID if found at the end
        }
        return slugMatch[1]; // Otherwise return the full slug
    }

    // Priority 1: Specific oechsle.online structure
    const onlineMatch = cleanUrl.match(/ecommerce\/prd\/(\d+)\.jpg/i);
    if (onlineMatch && onlineMatch[1]) {
        return onlineMatch[1];
    }

    // Priority 2: Check for explicit skuId or productId in query params
    const queryMatch = cleanUrl.match(/[?&](?:skuId|sku|productId|id)=(\d+)/i);
    if (queryMatch && queryMatch[1]) {
        return queryMatch[1];
    }

    // Priority 3: Digits at the very end of the path
    const urlPath = cleanUrl.split(/[?#]/)[0];
    const endMatch = urlPath.match(/[/-](\d+)$/);
    if (endMatch && endMatch[1] && endMatch[1].length >= 4) {
        return endMatch[1];
    }

    // Priority 4: Look for "ids" pattern
    const idsMatch = cleanUrl.match(/\/ids\/(\d+)/);
    if (idsMatch && idsMatch[1]) {
        return idsMatch[1];
    }

    return null;
  } catch (e) {
    console.error("Error extracting product ID:", e);
    return null;
  }
};

const fetchWithProxy = async (targetUrl: string): Promise<any> => {
  let lastError: any;
  const cacheBuster = `&_cb=${Date.now()}`;
  const urlWithCacheBuster = targetUrl.includes('?') 
    ? targetUrl + cacheBuster 
    : targetUrl + '?' + cacheBuster;

  for (const proxyGen of PROXIES) {
    try {
      const proxiedUrl = proxyGen(urlWithCacheBuster);
      const response = await fetch(proxiedUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {}
      }
    } catch (error) {
      lastError = error;
    }
  }
  
  throw lastError || new Error("No se pudo conectar con los servidores de Oechsle.");
};

export const fetchProductData = async (identifier: string): Promise<ExtractionResult> => {
  let data: any = null;
  const isNumeric = /^\d+$/.test(identifier);
  
  if (!isNumeric) {
      try {
        // Try direct slug search
        const urlSlug = `https://www.oechsle.pe/api/catalog_system/pub/products/search/${encodeURIComponent(identifier)}`;
        data = await fetchWithProxy(urlSlug);
        
        // If empty, try linkText filter
        if (!data || !Array.isArray(data) || data.length === 0) {
             const urlSlugFQ = `https://www.oechsle.pe/api/catalog_system/pub/products/search?fq=linkText:${encodeURIComponent(identifier)}`;
             data = await fetchWithProxy(urlSlugFQ);
        }
      } catch (e) {}
  } else {
      // Try multiple ID-based filters
      try {
        const url1 = `https://www.oechsle.pe/api/catalog_system/pub/products/search?fq=productId:${identifier}`;
        data = await fetchWithProxy(url1);
      } catch (e) {}

      if (!data || !Array.isArray(data) || data.length === 0) {
        try {
          const url2 = `https://www.oechsle.pe/api/catalog_system/pub/products/search?fq=skuId:${identifier}`;
          data = await fetchWithProxy(url2);
        } catch (e) {}
      }
  }

  const images: Set<string> = new Set();
  let productName = "Producto Desconocido";

  // If we started with a numeric ID, add the predictable backup URL immediately
  if (isNumeric) {
      images.add(`https://oechsle.online/ecommerce/prd/${identifier}.jpg`);
      productName = `Producto ${identifier}`;
  }

  if (data && Array.isArray(data) && data.length > 0) {
    const product = data[0];
    productName = product.productName || productName;
    
    // Once we have the API response, we can find the real productId and add its backup image
    if (product.productId) {
        images.add(`https://oechsle.online/ecommerce/prd/${product.productId}.jpg`);
    }

    if (product.items) {
      product.items.forEach((item: any) => {
        // Also add SKU-based backup image
        if (item.itemId) {
            images.add(`https://oechsle.online/ecommerce/prd/${item.itemId}.jpg`);
        }

        if (item.images) {
          item.images.forEach((img: any) => {
            if (img.imageUrl) {
              // Remove resize parameters
              const cleanUrl = img.imageUrl.split('?')[0]; 
              const highResUrl = cleanUrl.replace(/\/ids\/(\d+)(?:-[^/]+)?\//, '/ids/$1/');
              images.add(highResUrl);
            }
          });
        }
      });
    }
  }

  const imageList = Array.from(images);
  if (imageList.length === 0) {
    throw new Error("No se encontraron imágenes. Si el producto existe, intenta copiar el link exacto de la página.");
  }

  return { productName, images: imageList };
};
