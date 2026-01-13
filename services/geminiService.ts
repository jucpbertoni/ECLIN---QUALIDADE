
import { GoogleGenAI } from "@google/genai";

export const askQualityAssistant = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é o assistente virtual da ECLIN. Sua especialidade é gestão de qualidade em saúde, com foco total na acreditação ONA (Organização Nacional de Acreditação). Responda de forma profissional, concisa e orientada aos padrões ONA. Utilize tons de azul e termos técnicos adequados ao ambiente hospitalar/clínico.",
      }
    });
    return response.text || "Desculpe, não consegui processar sua solicitação.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o assistente inteligente.";
  }
};
