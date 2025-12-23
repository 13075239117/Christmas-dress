import { GoogleGenAI } from "@google/genai";
import { UploadedImage } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

/**
 * Checks if the user has selected an API key.
 * This is required for the Gemini 3 Pro Image model.
 */
export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  // Fallback for development environments outside of the specific testbed, 
  // though the prompt implies this environment.
  return !!process.env.API_KEY;
};

/**
 * Opens the API key selection dialog.
 */
export const requestApiKey = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  } else {
    console.warn("AI Studio API not available");
  }
};

/**
 * Generates the composite image.
 */
export const generateComposite = async (
  clothesImage: UploadedImage,
  personImage: UploadedImage,
  sceneDescription: string
): Promise<string> => {
  // Always create a new instance to ensure we have the latest key if selected via dialog
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert photo editor and compositor.
    
    **GOAL:** 
    Take the person from 'Image 2 (Model)' and dress them in the 'Image 1 (Garment)', placing them in the 'Scene Description'.
    
    **STRICT FACE PRESERVATION GUIDELINES:**
    - The face in the output MUST match 'Image 2' perfectly. 
    - **DO NOT CHANGE:** The eyes, eye shape, eye color, smile, mouth curvature, teeth visibility, nose shape, or facial expression.
    - **DO NOT CHANGE:** The gaze direction or the emotion on the face.
    - If the person is smiling in Image 2, they MUST be smiling exactly the same way in the result.
    - If the person is not smiling, do not add a smile.
    - The face should look like a copy-paste of the original identity, blended naturally into the new lighting.
    
    **CLOTHING & SCENE:**
    - Replace the original clothing of the person with 'Image 1'.
    - Fit the new clothing to the person's original body pose and shape.
    - Generate the background according to the 'Scene Description'.
    
    **OUTPUT QUALITY:**
    - Photorealistic, high resolution. 
    - Seamless blending of the preserved face/head with the new body/outfit and background.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: clothesImage.mimeType,
              data: clothesImage.data,
            },
          },
          {
            inlineData: {
              mimeType: personImage.mimeType,
              data: personImage.data,
            },
          },
        ],
      },
      config: {
        // High quality image settings
        imageConfig: {
            imageSize: "1K",
            aspectRatio: "3:4" // Portrait usually works better for full body fashion
        }
      },
    });

    // Extract the image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    // Handling the specific "Requested entity was not found" error implies key issues
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};