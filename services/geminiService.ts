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

  const hasScene = sceneDescription && sceneDescription.trim().length > 0;

  const contextInstruction = hasScene
    ? `**3. SCENE REPLACEMENT:**
       - **REPLACE** the background completely with this scene description: "${sceneDescription}".
       - Adjust the lighting on the person and the garment to match this new environment naturally.
       - **DO NOT** alter the person's facial structure or skin tone color due to lighting changes.`
    : `**3. SCENE PRESERVATION (LOCKED LAYER):**
       - **BACKGROUND:** The background must be PIXEL-PERFECT identical to IMAGE 2. Do not blur, shift, or relight it.
       - **LIGHTING:** The shadows and highlights on the face and background must remain exactly where they are in IMAGE 2.`;

  const prompt = `
    You are an advanced AI image compositor. Your task is "Virtual Try-On".

    **CRITICAL INPUT DEFINITIONS (READ CAREFULLY):**
    - **[IMAGE 1] (First Image Provided):** SOURCE GARMENT. This image contains the clothing to be used. IGNORE any person/body/face inside Image 1.
    - **[IMAGE 2] (Second Image Provided):** TARGET MODEL (THE BASE). This image contains the person who will wear the clothes. 

    **THE TASK:**
    Take the clothing from [IMAGE 1] and warp/drape it onto the body of the person in [IMAGE 2].

    **FATAL ERROR PREVENTION - DO NOT DO THIS:**
    - ❌ **DO NOT** put the face from Image 2 onto the body of Image 1. (No Face Swapping).
    - ❌ **DO NOT** output Image 1 with a new face.
    - ❌ **DO NOT** change the pose of Image 2 to match Image 1.
    
    **CORRECT EXECUTION FLOW:**
    1.  Start with **[IMAGE 2]** as your canvas. The output pixel dimensions and composition must match Image 2.
    2.  Keep the Head, Hair, Hands, and Background of [IMAGE 2] exactly as they are (**LOCKED LAYERS**).
    3.  Erase the original clothes on the person in [IMAGE 2].
    4.  Generate the clothes from [IMAGE 1] onto the body of [IMAGE 2].

    **DETAILED CONSTRAINTS:**

    1.  **HAIR & HEAD (LOCKED FROM IMAGE 2):**
        - **Texture Lock:** Do not smooth out frizz, split ends, or messy strands. If the hair looks dry or oily in Image 2, keep it exactly that way.
        - **Geometry Lock:** Do not change the volume, length, or silhouette. The outline of the hair against the background must trace the exact same path.
        - **Interaction:** The clothes go UNDER the hair of Image 2.

    2.  **POSE & BODY (LOCKED FROM IMAGE 2):**
        - **Bone Structure:** Do not move the shoulders, neck, or head of Image 2 by even 1 millimeter.
        - **Hands:** Preserve hand positions from Image 2.

    3.  **CLOTHING SYNTHESIS:**
        - Adapt the fabric from Image 1 to the body shape of Image 2.
    
    ${contextInstruction}

    **SUMMARY:**
    - The Base is IMAGE 2.
    - The Clothes are from IMAGE 1.
    - Result = [IMAGE 2 Body/Head/Bg] + [IMAGE 1 Clothes].
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
            aspectRatio: "3:4"
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

  // If scene is empty, provide a generic "keep it subtle" prompt so video generation doesn't hallucinate wild movements
  const contextPrompt = sceneDescription && sceneDescription.trim().length > 0
    ? sceneDescription
    : "Keep the original background atmosphere and lighting.";

  try {
    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL_NAME,
      prompt: `Create a 'Live Photo' style video (approx 3 seconds). Subtle, natural motion. Breathing, slight wind, or background movement. ${contextPrompt}`,
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
