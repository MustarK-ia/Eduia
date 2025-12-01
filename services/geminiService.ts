import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ChatMessage, Role } from "../types";

class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private currentSystemPrompt: string = "";
  private currentThinkingBudget: number | undefined = undefined;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    } catch (error) {
      console.error("Gemini API Error:", error);
      yield "Desculpe, tive um problema ao tentar responder. Verifique sua conexão ou tente novamente mais tarde.";
    }
  }
}

export const geminiService = new GeminiService();