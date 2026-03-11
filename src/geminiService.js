import { GoogleGenerativeAI } from "@google/generative-ai";

// Access the API key from environment variables (lazy so app loads without key)
function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API key is missing. Set VITE_GEMINI_API_KEY in your .env file.");
  }
  return key;
}

function getModel() {
  const genAI = new GoogleGenerativeAI(getApiKey());
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
}

/**
 * Converts a File object to a GoogleGenerativeAI Part object.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result is a data URL: data:image/jpeg;base64,...
      // We need to extract the base64 part
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Analyzes seed quality using Gemini Vision.
 * @param {File} image - The image file of seeds.
 * @returns {Promise<Object>} - { status, score, detail }
 */
export async function analyzeSeedQuality(image) {
  try {
    if (!image) {
      throw new Error("No image file provided for analysis.");
    }
    if (!image.type || !image.type.startsWith("image/")) {
      throw new Error("Selected file is not a valid image.");
    }

    const imagePart = await fileToGenerativePart(image);
    
    const prompt = `Analyze this image of loose seeds for quality verification. 
    1. Identify the specific plant/crop (e.g., Wheat, Corn, Rice, Cotton, etc.).
    2. Count broken grains, dust, and non-seed impurities.
    3. Calculate a purity score from 0-100 based on the ratio of healthy seeds.
    
    You MUST return strictly a JSON object with this exact structure: 
    { 
      "seedType": "string", 
      "purityScore": number, 
      "details": "string" 
    }`;
    
    const model = getModel();
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
       console.error("Raw response:", text);
       throw new Error("Invalid response format from Gemini: No JSON found");
    }
    
    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    const data = JSON.parse(jsonStr);
    
    // Validate required fields
    if (typeof data.purityScore === 'undefined') {
        throw new Error("Response missing purityScore");
    }
    if (typeof data.seedType === 'undefined') {
        throw new Error("Response missing seedType");
    }

    const purityScore = Number(data.purityScore);
    const seedType = data.seedType || 'Unknown';
    const analysis_detail = data.details || 'Analysis complete.';
    
    // Condition: If the score is > 95%, the batch is "Approved"
    const status = purityScore > 95 ? 'Approved' : 'Rejected';
    
    return {
      status,
      score: purityScore,
      seedType: seedType,
      detail: analysis_detail
    };
  } catch (error) {
    console.error("Error analyzing seed quality:", error);
    throw error;
  }
}
