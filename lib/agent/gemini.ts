import { GoogleGenAI, Modality, type Content } from "@google/genai";

const MODEL = "gemini-2.5-flash-image";

let cachedClient: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!cachedClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

export type GeneratedImage = {
  data: Buffer;
  mimeType: string;
};

export type RefineHistoryItem = {
  role: "user" | "model";
  text?: string;
  image?: { data: Buffer; mimeType: string };
};

function extractImage(parts: Array<{ inlineData?: { data?: string; mimeType?: string } }>): GeneratedImage {
  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data && inline.mimeType) {
      return {
        data: Buffer.from(inline.data, "base64"),
        mimeType: inline.mimeType,
      };
    }
  }
  throw new Error("Gemini response did not contain an image");
}

export async function generateScene(args: {
  productImage?: { data: Buffer; mimeType: string };
  prompt: string;
}): Promise<GeneratedImage> {
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
  if (args.productImage) {
    parts.push({
      inlineData: {
        mimeType: args.productImage.mimeType,
        data: args.productImage.data.toString("base64"),
      },
    });
  }
  parts.push({ text: args.prompt });

  const response = await client().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts;
  if (!responseParts) throw new Error("Gemini response missing parts");
  return extractImage(responseParts);
}

export async function refineScene(args: {
  history: RefineHistoryItem[];
  prompt: string;
}): Promise<GeneratedImage> {
  const contents: Content[] = args.history.map((item) => ({
    role: item.role,
    parts: [
      ...(item.image
        ? [
            {
              inlineData: {
                mimeType: item.image.mimeType,
                data: item.image.data.toString("base64"),
              },
            },
          ]
        : []),
      ...(item.text ? [{ text: item.text }] : []),
    ],
  }));

  contents.push({ role: "user", parts: [{ text: args.prompt }] });

  const response = await client().models.generateContent({
    model: MODEL,
    contents,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini response missing parts");
  return extractImage(parts);
}
