import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private currentSystemPrompt: string = "";
  private currentThinkingBudget: number | undefined = undefined;

  constructor() {
    // Validate API Key
    const apiKey = (process.env.API_KEY || "").trim();
    
    if (!apiKey) {
      console.error("FATAL: API_KEY is missing.");
    }
    
    // Initialize Google SDK
    this.ai = new GoogleGenAI({ apiKey: apiKey });
  }

  // Initialize a new chat session with optional thinking budget
  public startChat(systemInstruction: string, thinkingBudget?: number) {
    this.currentSystemPrompt = systemInstruction;
    this.currentThinkingBudget = thinkingBudget;
    
    // Configure the chat with the appropriate model and tools
    // We use gemini-2.5-flash as the standard efficient model
    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        // Only apply thinking config if a budget is provided (e.g. for Math/Science)
        thinkingConfig: thinkingBudget ? { thinkingBudget } : undefined,
        // Disable temperature if thinking is enabled (model controls it), otherwise use standard creativity
        temperature: thinkingBudget ? undefined : 0.7,
        // Enable Google Search for grounding information
        tools: [{googleSearch: {}}], 
      },
    });
  }

  // Send a message (text or text + image)
  public async *sendMessageStream(
    text: string, 
    imageBase64?: string, 
    mimeType?: string
  ): AsyncGenerator<string, void, unknown> {
    
    if (!this.chat) {
      // Auto-start if not started (fallback)
      this.startChat("Você é uma assistente útil.");
    }

    try {
      let messageInput: any = text;

      // Handle Image input by constructing a parts array
      if (imageBase64 && mimeType) {
        messageInput = [
            { text: text || "Analise esta imagem." },
            {
                inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                }
            }
        ];
      }

      // Send message using the SDK
      // The chat object maintains history automatically
      if (this.chat) {
          const streamResult = await this.chat.sendMessageStream({ message: messageInput });

          for await (const chunk of streamResult) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
              yield c.text;
            }
          }
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      yield this.handleError(error);
    }
  }

  private handleError(error: any): string {
    if (error.toString().includes("API key")) {
        return "Erro de autenticação. Verifique se a chave API no arquivo vite.config.ts está correta.";
    } else if (error.toString().includes("429")) {
        return "Muitas requisições. O serviço está ocupado, tente novamente em alguns instantes.";
    }
    return "Desculpe, ocorreu um erro ao conectar com o Google Gemini. Tente novamente.";
  }
}

export const geminiService = new GeminiService();