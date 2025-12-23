import { GoogleGenAI } from "@google/genai";
import { UploadedImage } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';
const VIDEO_MODEL_NAME = 'veo-3.1-fast-generate-preview';

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
    Generate a high-quality, photorealistic image based on the following instructions.
    
    You are an expert photo editor and compositor.
    
    **GOAL:** 
    Take the person from 'Image 2 (Model)' and dress them in the 'Image 1 (Garment)', placing them in the 'Scene Description'.
    
    **STRICT FACE PRESERVATION GUIDELINES (CRITICAL):**
    - The face in the output MUST match 'Image 2' perfectly. 
    - **DO NOT CHANGE:** The eyes, eye shape, eye color, smile, mouth curvature, teeth visibility, nose shape, or facial expression.
    - **DO NOT CHANGE:** The gaze direction or the emotion on the face.
    - If the person is smiling in Image 2, they MUST be smiling exactly the same way in the result.
    - The face should look like a copy-paste of the original identity.
    
    **STRICT BODY SHAPE PRESERVATION (CRITICAL):**
    - **RETAIN PHYSIQUE:** You MUST preserve the exact body proportions, weight, and build of the person in Image 2.
    - **DO NOT ALTER MEASUREMENTS:** Do not change the waist circumference, bust size, hip width, shoulder width, or arm thickness.
    - **NO SLIMMING OR RESHAPING:** Do not idealize the body type. Do not make the person thinner, more muscular, or curvier than they are in the original photo.
    - **FIT:** The clothing from Image 1 must be warped and draped to fit the *existing* body volume of Image 2. The body must NOT be morphed to fit the clothes.
    
    **CLOTHING & SCENE:**
    - Replace the original clothing of the person with 'Image 1'.
    - Generate the background according to the 'Scene Description'.
    - Lighting must be realistic and consistent with the scene.
    
    **OUTPUT QUALITY:**
    - Photorealistic, high resolution. 
    - Seamless blending of the preserved face/body with the new outfit and background.
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

    // Check for inline image data
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    // Check for text refusal/explanation if no image
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
        console.warn("Model returned text instead of image:", textPart.text);
        throw new Error(textPart.text);
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

/**
 * Generates a video based on the composite image.
 */
export const generateLiveVideo = async (
  imageSrc: string,
  sceneDescription: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract base64 from data URL
  const base64Data = imageSrc.split(',')[1];
  const mimeType = imageSrc.substring(imageSrc.indexOf(':') + 1, imageSrc.indexOf(';'));

  try {
    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL_NAME,
      prompt: `Create a 'Live Photo' style video (approx 3 seconds). Subtle, natural motion. Breathing, slight wind, or background movement. ${sceneDescription}`,
      image: {
        imageBytes: base64Data,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16', // Veo supports 9:16 or 16:9
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI found");

    // Fetch the actual video bytes using the API key
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Veo Generation Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};
