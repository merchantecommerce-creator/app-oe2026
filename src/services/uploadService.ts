
import { ProductImage, VtexConfig } from '../types';

/**
 * Uploads an image directly to the VTEX SKU Catalog.
 * Uses the endpoint: POST https://{accountName}.{environment}.com.br/api/catalog/pvt/sku/stockkeepingunitbyid/{skuId}/file
 */
export const uploadImageToVtex = async (
  image: ProductImage, 
  skuId: string, 
  config: VtexConfig
): Promise<{ success: boolean; message?: string }> => {
  if (!image.blob || !skuId || !config.appKey) {
    return { success: false, message: "Faltan datos de configuración o imagen." };
  }

  const { accountName, appKey, appToken, environment } = config;
  const url = `https://${accountName}.${environment}.com.br/api/catalog/pvt/sku/stockkeepingunitbyid/${skuId}/file`;

  try {
    // VTEX expects a JSON body with the image metadata or a Multi-part form
    // The most reliable way for remote images is providing the URL, 
    // but for local/edited ones we use the actual file bytes.
    
    const filename = image.suggestedName 
      ? `${image.suggestedName}.jpg` 
      : `img-${skuId}-${Date.now()}.jpg`;

    // Note: To avoid CORS issues in a browser-only environment, 
    // VTEX API usually requires being called from a server or having specific CORS setup.
    // We use a proxy if needed, but here we'll try direct call first.
    
    const formData = new FormData();
    formData.append('IsMain', 'false'); // Set to true if it should be the primary image
    formData.append('Label', image.suggestedName || 'Product Image');
    formData.append('Name', filename);
    formData.append('File', image.blob, filename);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-VTEX-API-AppKey': appKey,
        'X-VTEX-API-AppToken': appToken,
        'Accept': 'application/json'
      },
      body: formData
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        message: errorData.message || `Error ${response.status}: No se pudo subir a VTEX.` 
      };
    }
  } catch (error: any) {
    console.error(`Error uploading to VTEX:`, error);
    return { success: false, message: error.message || "Error de conexión con VTEX." };
  }
};

/**
 * Legacy/Mock upload for other servers
 */
export const uploadImageToServer = async (image: ProductImage, productName: string): Promise<boolean> => {
  console.log(`[Mock Upload] Uploading ${image.suggestedName} to external server...`);
  await new Promise(resolve => setTimeout(resolve, 800));
  return true;
};
