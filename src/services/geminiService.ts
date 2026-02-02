
import { GoogleGenAI } from "@google/genai";
import { resizeBlob } from "./imageService";

// Helper to initialize the Gemini client with the API key from environment variables
const getGeminiClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// Helper to convert Blob to base64 string for model input
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to calculate the best aspect ratio for image generation based on target dimensions
const calculateBestAspectRatio = (width?: number, height?: number): "1:1" | "4:3" | "3:4" | "16:9" | "9:16" => {
    if (!width || !height) return "1:1";
    const ratio = width / height;
    
    const targets = [
        { name: "1:1", val: 1 },
        { name: "4:3", val: 1.33 },
        { name: "3:4", val: 0.75 },
        { name: "16:9", val: 1.77 },
        { name: "9:16", val: 0.56 }
    ];

    const closest = targets.reduce((prev, curr) => 
        Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
    );

    return closest.name as any;
};

// Generates a short descriptive name for an image using Gemini 3 Flash
export const generateImageDescription = async (blob: Blob): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const base64Data = await blobToBase64(blob);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: "Identify the object in this image. Provide a very short, filename-friendly string (lowercase, hyphens instead of spaces, no special chars) describing it. Example: 'dining-table-wood-brown'. Max 5 words."
          }
        ]
      }
    });

    const text = response.text?.trim() || "imagen-procesada";
    return text.replace(/[^a-z0-9-]/g, '');

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "imagen-sin-nombre";
  }
};

// FIX: Added queryImagesWithPrompt to handle multi-image reasoning queries in AiVisionModal
export const queryImagesWithPrompt = async (blobs: Blob[], prompt: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    
    // Process all blobs into parts for the model
    const imageParts = await Promise.all(blobs.map(async (blob) => {
      const base64Data = await blobToBase64(blob);
      return {
        inlineData: {
          mimeType: blob.type || 'image/jpeg',
          data: base64Data
        }
      };
    }));

    // Use Gemini 3 Pro for complex vision and reasoning tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      }
    });

    return response.text || "No se pudo obtener una respuesta de la IA.";
  } catch (error) {
    console.error("Gemini query failed:", error);
    throw new Error("Error al consultar a la IA sobre las imágenes.");
  }
};

// Generates a new image based on a prompt and optional reference image using Gemini 2.5 Flash Image
export const generateAiImage = async (prompt: string, referenceImage?: Blob, targetWidth?: number, targetHeight?: number): Promise<Blob> => {
    try {
        const ai = getGeminiClient();
        const parts: any[] = [{ text: prompt }];
        const aspectRatio = calculateBestAspectRatio(targetWidth, targetHeight);

        if (referenceImage) {
            const base64Data = await blobToBase64(referenceImage);
            parts.unshift({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        let generatedBlob: Blob | null = null;
        // Iterate through parts to find the image data
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64Data = part.inlineData.data;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                generatedBlob = new Blob([byteArray], { type: 'image/png' });
                break;
            }
        }

        if (!generatedBlob) throw new Error("La IA no devolvió ninguna imagen.");

        // Post-processing: Resize to original pixel dimensions if requested
        if (targetWidth && targetHeight) {
            return await resizeBlob(generatedBlob, targetWidth, targetHeight);
        }

        return generatedBlob;
    } catch (error: any) {
        console.error("Image Generation failed:", error);
        throw new Error(error.message || "Error al generar la imagen.");
    }
};
