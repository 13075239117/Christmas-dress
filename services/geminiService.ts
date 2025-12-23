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
    : `**3. SCENE PRESERVATION (CRITICAL):**
       - **DO NOT CHANGE THE BACKGROUND.** You MUST keep the exact original background from Image 2 (Model).
       - **DO NOT CHANGE THE LIGHTING.** The lighting direction and intensity must remain identical to Image 2.
       - **DO NOT CHANGE THE ENVIRONMENT.** The location must look exactly the same.
       - The goal is ONLY to change the clothes, leaving the rest of the photo untouched.`;

  const prompt = `
    You are a professional high-end photo retoucher specializing in "Virtual Try-On" technology.
    
    **TASK:** Digitally dress the person from **Image 2 (Model)** in the clothing from **Image 1 (Garment)**.
    
    **INPUTS:**
    - **Image 1 (Clothing):** The garment to be worn.
    - **Image 2 (Base Model):** The person, pose, body, and context to use as the base.
    
    **STRICT COMPOSITING RULES (ZERO TOLERANCE FOR HALLUCINATION):**
    
    1.  **THE PERSON (IMMUTABLE BASE):**
        - The pixel data for the face, hair, hands, and skin tone MUST come from **Image 2**.
        - **ABSOLUTE IDENTITY MATCH:** If the face changes even slightly (eyes, nose, mouth shape, expression), the result is a FAILURE. It must be the EXACT same person.
        - **ABSOLUTE POSE MATCH:** The head tilt, arm position, finger placement, and body posture must be IDENTICAL to **Image 2**.
        - **ABSOLUTE BODY SHAPE MATCH:** Do not slim, flatten, or enhance the body. Keep the exact waist, bust, and hip measurements of **Image 2**.
        - **FACIAL EXPRESSION:** If the person is smiling, they must smile exactly the same way. If serious, they must be serious.

    2.  **THE CLOTHING (TRANSFORMATION):**
        - Warp and drape the clothing from **Image 1** onto the body of **Image 2**.
        - Respect the physics of the fabric.
        - The clothes adapt to the body; the body does NOT adapt to the clothes.
        - Remove the old clothes from Image 2 completely.

    ${contextInstruction}

    **OUTPUT:**
    - A photorealistic, seamless composite image.
    - High resolution, sharp details.
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