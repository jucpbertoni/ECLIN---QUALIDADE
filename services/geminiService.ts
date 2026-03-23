
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
        systemInstruction: `Você é a IA da ECLIN, um assistente especializado em Qualidade Hospitalar e Engenharia Clínica. 
        Seu objetivo é tirar dúvidas sobre:
        1. Certificação em ambientes hospitalares (foco em ONA).
        2. Normas vigentes (RDC 50, RDC 63, NBRs de saúde).
        3. Serviços de Engenharia Clínica (manutenção, calibração, gestão de parque tecnológico).
        4. Áreas de apoio (Biossegurança, Suprimentos, TI, Gestão de Pessoas).
        Responda de forma técnica, profissional e direta, sempre focando na segurança do paciente e excelência operacional.`,
      }
    });
    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Erro Gemini:", error);
    return "Erro ao processar consulta. Verifique sua conexão ou a validade da sua chave API.";
  }
};
