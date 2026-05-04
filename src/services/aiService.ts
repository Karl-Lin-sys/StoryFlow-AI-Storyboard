import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface StoryboardPanel {
  panelNumber: number;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export async function parseScriptToPanels(script: string): Promise<StoryboardPanel[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-preview",
    contents: `Analyze the following script and break it down into 3-8 key storyboard panels. 
For each panel, provide a concise description of the action and a highly detailed imagePrompt for an AI image generator to draw the storyboard frame. 
Specify the visual styling within the image prompt (e.g., "Cinematic lighting, high contrast, black and white sketch style" or whatever fits best).

Script:
${script}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            panelNumber: { type: Type.INTEGER },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["panelNumber", "description", "imagePrompt"]
        }
      }
    }
  });
  
  if (!response.text) return [];

  const rawPanels = JSON.parse(response.text);
  return rawPanels.map((p: any) => ({
    ...p,
    status: 'pending'
  }));
}

export async function generatePanelImage(prompt: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3"
      }
    }
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) return null;

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      const base64EncodeString = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || 'image/jpeg';
      return `data:${mimeType};base64,${base64EncodeString}`;
    }
  }
  return null;
}
