
import { GoogleGenAI } from "@google/genai";

export const askQualityAssistant = async (prompt: string): Promise<string> => {
  // Tenta pegar de várias formas possíveis em diferentes ambientes
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY não encontrada no ambiente.");
    return "O assistente está offline. Verifique se a API_KEY foi configurada corretamente no painel da Vercel.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é o assistente virtual da ECLIN. Sua especialidade é gestão de qualidade em saúde e acreditação ONA. Responda de forma profissional e direta.",
      }
    });
    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Erro Gemini:", error);
    return "Erro ao processar consulta. Verifique sua conexão ou a validade da sua chave API.";
  }
};
