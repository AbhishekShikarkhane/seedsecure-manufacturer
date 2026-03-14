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
    model: "gemini-2.5-flash",  // only model with actual free quota on this account
    generationConfig: { responseMimeType: "application/json" }
  });
}

function getTextModel() {
  const genAI = new GoogleGenerativeAI(getApiKey());
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // only model with actual free quota on this account
}

// Retry helper: if Gemini returns 429, wait the suggested delay then try once more
async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    const msg = err?.message || '';
    const is429 = msg.includes('429') || err?.status === 429;

    if (is429) {
      // Only flag as daily-exhausted if the quotaId explicitly says "PerDay"
      // Per-minute limits (PerMinute) should still be retried, not immediately failed
      const isDailyExhausted = msg.includes('PerDayPerProject') || msg.includes('PerDay') && !msg.includes('PerMinute');
      if (isDailyExhausted) {
        throw new Error('DAILY_QUOTA_EXHAUSTED');
      }

      // Correctly extract delay from "Please retry in Xs" — cap at 60s
      const retryMatch = msg.match(/retry in\s+([\d.]+)s/i);
      const delaySec = retryMatch ? Math.min(Math.ceil(parseFloat(retryMatch[1])) + 1, 60) : 12;
      console.warn(`Gemini 429 — retrying in ${delaySec}s...`);
      await new Promise(r => setTimeout(r, delaySec * 1000));
      return await fn(); // one retry
    }
    throw err;
  }
}

/**
 * Generates a 2-sentence executive supply chain summary from compressed batch data.
 * @param {Array} batches - Filtered batch objects from the Analytics Command Center.
 * @returns {Promise<string>} - Plain text executive summary.
 */
export async function generateSupplyChainInsight(batches) {
  if (!batches || batches.length === 0) return "No data available to analyze.";

  const compressedData = batches.map(b => ({
    seed: b.seedType || 'Unknown',
    status: b.status || 'Unknown',
    purity: b.purityScore ?? null,
    packets: Array.isArray(b.childPacketIDs) ? b.childPacketIDs.length : 0,
    sold: Array.isArray(b.soldChildPackets) ? b.soldChildPackets.length : 0,
  }));

  const prompt = `You are an expert AI Supply Chain Analyst for an agricultural blockchain system called SeedSecure.
I am providing you with a JSON array of currently filtered seed batches.

Data: ${JSON.stringify(compressedData)}

Task: Write a maximum 3-bullet executive summary based ONLY on this data. Be direct and concise.

Required format (use EXACTLY this structure, plain text only):
STATUS: [single word — HEALTHY, WARNING, or CRITICAL]
1. [One observation about logistics bottlenecks. Max 10 words.]
2. [One observation about purity scores vs 95% threshold. Max 10 words.]
3. [One specific actionable recommendation. Max 10 words.]

DO NOT use markdown, asterisks, or code. Plain text only. No extra lines.`;

  const model = getTextModel();
  const result = await withRetry(() => model.generateContent(prompt));
  return result.response.text().trim();
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
export async function analyzeSeedQuality(image, knownSeeds = []) {
  try {
    if (!image) {
      throw new Error("No image file provided for analysis.");
    }
    if (!image.type || !image.type.startsWith("image/")) {
      throw new Error("Selected file is not a valid image.");
    }

    const imagePart = await fileToGenerativePart(image);

    // Build the dynamic memory string from existing batch seed types
    const knownSeedsString = knownSeeds.length > 0
      ? knownSeeds.join(", ")
      : "None yet — this is the first batch.";

    const prompt = `You are an expert agricultural supply chain AI acting as a seed quality inspector.

Analyze the uploaded image and perform the following tasks:

TASK 1 — SEED IDENTIFICATION (Dynamic Memory Prompting):
You must follow these strict naming rules to maintain database integrity:

RULE 1 — EXISTING SEEDS:
Our system currently knows these seed categories: [${knownSeedsString}].
If the seed in the image matches ANY of these existing categories, you MUST return that EXACT string — same capitalization, same phrasing. Do not alter it.

RULE 2 — NEW DISCOVERIES:
If the seed is genuinely new and not in the known list, generate a clean standardized name:
- Use the common plural noun (e.g., "Chia Seeds", "Wheat", "Soybeans").
- Do NOT include adjectives like "Hulled", "Roasted", "Raw", or processing states like "Pepitas" or "Kernels".
- Capitalize the first letter of each word.

TASK 2 — QUALITY ANALYSIS:
1. Count broken grains, dust, and non-seed impurities visible in the image.
2. Calculate a purity score from 0–100 based on the ratio of healthy, intact seeds to total matter.
3. Write a concise 1-2 sentence quality detail explaining the score.

Return ONLY a valid JSON object with this exact structure, no extra text:
{
  "seedType": "string (exact match from known list OR new standardized name)",
  "purityScore": number,
  "details": "string"
}`;

    const model = getModel();
    const result = await withRetry(() => model.generateContent([prompt, imagePart]));
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
