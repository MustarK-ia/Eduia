import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private currentSystemPrompt: string = "";
  private currentThinkingBudget: number | undefined = undefined;

  constructor() {
    // Validate API Key
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.error("FATAL: API_KEY is missing. Please set it in your environment variables (e.g., Vercel Settings).");
    } else if (apiKey.startsWith("sk-or-")) {
      console.error("CONFIGURATION ERROR: You are using an OpenRouter key (sk-or-...). The @google/genai SDK requires an official Google API Key (starts with AIza). Please get one at aistudio.google.com");
    }

    // Initialize with provided key or fallback to empty string to prevent immediate crash (calls will fail later)
    this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
  }

  // Initialize a new chat session with optional thinking budget
  public startChat(systemInstruction: string, thinkingBudget?: number) {
    this.currentSystemPrompt = systemInstruction;
    this.currentThinkingBudget = thinkingBudget;
    
    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        // Only set thinkingConfig if a budget is provided. 
        // When thinking is enabled, temperature should generally not be set (or set to defaults)
        thinkingConfig: thinkingBudget ? { thinkingBudget } : undefined,
        temperature: thinkingBudget ? undefined : 0.7,
      },
    });
  }

  // Send a message (text or text + image)
  public async *sendMessageStream(
    text: string, 
    imageBase64?: string, 
    mimeType?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!process.env.API_KEY) {
        yield "⚠️ Erro de Configuração: API_KEY não encontrada. Configure a chave nas variáveis de ambiente do Vercel.";
        return;
    }
    
    if (process.env.API_KEY.startsWith("sk-or-")) {
        yield "⚠️ Erro de Chave: Você está usando uma chave OpenRouter. Este app requer uma chave oficial do Google (AIza...).";
        return;
    }

    if (!this.chat && !imageBase64) {
      throw new Error("Chat not initialized");
    }

    try {
      let streamResult;
      
      if (imageBase64 && mimeType) {
        // Use generateContentStream for multimodal requests (stateless turn)
        streamResult = await this.ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64
                }
              },
              { text: text || "Analise esta imagem escolar." }
            ]
          },
          config: {
            systemInstruction: this.currentSystemPrompt,
            thinkingConfig: this.currentThinkingBudget ? { thinkingBudget: this.currentThinkingBudget } : undefined,
          }
        });
      } else {
        // Standard text chat
        if (!this.chat) this.startChat(this.currentSystemPrompt);
        
        // Chat.sendMessageStream takes an object with a 'message' property
        streamResult = await this.chat!.sendMessageStream({ message: text });
      }

      for await (const chunk of streamResult) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errorMessage = "Desculpe, tive um problema ao tentar responder.";
      
      if (error.message?.includes("403") || error.toString().includes("API key")) {
          errorMessage = "Erro de autenticação (403). Verifique se sua API KEY é válida e pertence ao Google AI Studio.";
      } else if (error.message?.includes("429")) {
          errorMessage = "Muitas requisições. Por favor, aguarde um momento.";
      }
      
      yield errorMessage;
    }
  }
}

export const geminiService = new GeminiService();