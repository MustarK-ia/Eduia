import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  private currentSystemPrompt: string = "";
  private currentThinkingBudget: number | undefined = undefined;
  
  // OpenRouter specific state
  private isOpenRouter: boolean = false;
  private openRouterKey: string = "";
  // History now stores extended properties like reasoning_details
  private openRouterHistory: Array<{ role: string; content: any; reasoning_details?: any }> = [];

  constructor() {
    // Validate API Key
    const apiKey = (process.env.API_KEY || "").trim();
    
    if (!apiKey) {
      console.error("FATAL: API_KEY is missing.");
    } else if (apiKey.startsWith("sk-or-")) {
      console.log("Configuration: Using OpenRouter API Key.");
      this.isOpenRouter = true;
      this.openRouterKey = apiKey;
    } else {
      // Initialize Google SDK for standard Google keys
      this.ai = new GoogleGenAI({ apiKey: apiKey });
    }
  }

  // Initialize a new chat session with optional thinking budget
  public startChat(systemInstruction: string, thinkingBudget?: number) {
    this.currentSystemPrompt = systemInstruction;
    this.currentThinkingBudget = thinkingBudget;
    
    if (this.isOpenRouter) {
      // Reset OpenRouter history
      this.openRouterHistory = [
        { role: "system", content: systemInstruction }
      ];
    } else if (this.ai) {
      // Reset Google SDK Chat
      this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          thinkingConfig: thinkingBudget ? { thinkingBudget } : undefined,
          temperature: thinkingBudget ? undefined : 0.7,
          tools: [{googleSearch: {}}], // Enable native search for Google keys
        },
      });
    }
  }

  // Send a message (text or text + image)
  public async *sendMessageStream(
    text: string, 
    imageBase64?: string, 
    mimeType?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!process.env.API_KEY) {
        yield "⚠️ **Erro de Configuração:** API_KEY não encontrada no sistema.";
        return;
    }

    // --- OpenRouter Implementation (Fetch / Non-Streaming as requested) ---
    if (this.isOpenRouter) {
        try {
            const responseText = await this.fetchOpenRouter(text, imageBase64, mimeType);
            yield responseText;
        } catch (error: any) {
            console.error("OpenRouter Error:", error);
            // Check specifically for the 401 flag we throw in fetchOpenRouter
            if (error.message === "OPENROUTER_401") {
                yield `### ⛔ Acesso Negado (Erro 401)
                
A chave de API configurada no código (**sk-or-v1-bd6e...**) foi rejeitada pelo servidor ("User not found"). Isso significa que ela expirou ou foi deletada.

**Como resolver gratuitamente:**
1. Acesse [openrouter.ai](https://openrouter.ai)
2. Faça login com sua conta Google.
3. Vá em "Keys" e crie uma nova chave.
4. Substitua a chave no arquivo \`vite.config.ts\`.`;
            } else {
                yield `Desculpe, ocorreu um erro técnico: ${error.message || "Falha na conexão"}.`;
            }
        }
        return;
    }

    // --- Google GenAI SDK Implementation (Standard) ---
    if (!this.chat && !imageBase64) {
      throw new Error("Chat not initialized");
    }

    try {
      let streamResult;
      
      if (imageBase64 && mimeType && this.ai) {
        // Stateless multimodal call
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
            tools: [{googleSearch: {}}],
          }
        });
      } else if (this.chat) {
        // Stateful text chat
        streamResult = await this.chat.sendMessageStream({ message: text });
      }

      if (streamResult) {
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

  // --- OpenRouter Private Methods ---

  private async fetchOpenRouter(text: string, imageBase64?: string, mimeType?: string): Promise<string> {
    // 1. Prepare User Message
    const userContent: any[] = [{ type: "text", text: text }];
    
    if (imageBase64 && mimeType) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
            }
        });
    }

    // Use simple string content if no image (better compatibility for some models, 
    // but multimodals usually handle array content fine)
    const finalContent = (imageBase64) ? userContent : text;

    const newMessage = { role: "user", content: finalContent };
    this.openRouterHistory.push(newMessage);

    // 2. Select Model
    // Updated to Amazon Nova 2 Lite as requested
    const model = "amazon/nova-2-lite-v1:free"; 
    
    // 3. Make the API Call (Non-streaming as requested)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${this.openRouterKey}`,
            "HTTP-Referer": "https://eduia.app",
            "X-Title": "EduIA",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: this.openRouterHistory,
            // Enable reasoning as requested in the snippet
            reasoning: { enabled: true }
        })
    });

    if (response.status === 401) {
        throw new Error("OPENROUTER_401");
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Status: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice || !choice.message) {
        throw new Error("Invalid response from OpenRouter");
    }

    const responseMessage = choice.message;
    const content = responseMessage.content || "";
    
    // 4. Capture Reasoning Details (Crucial for "Chain of Thought")
    const reasoningDetails = responseMessage.reasoning_details || responseMessage.reasoning_content || null;

    // 5. Update History
    // We store the assistant message WITH the reasoning details so it can continue thinking in the next turn
    const historyEntry: any = {
        role: "assistant",
        content: content
    };

    if (reasoningDetails) {
        historyEntry.reasoning_details = reasoningDetails;
    }

    this.openRouterHistory.push(historyEntry);

    return content;
  }

  private handleError(error: any): string {
    if (error.message?.includes("403") || error.toString().includes("API key")) {
        return "Erro de autenticação. Verifique se sua API KEY é válida.";
    } else if (error.message?.includes("429")) {
        return "Muitas requisições. Por favor, aguarde um momento.";
    }
    return "Desculpe, tive um problema ao tentar responder.";
  }
}

export const geminiService = new GeminiService();