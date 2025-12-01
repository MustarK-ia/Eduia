import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  private currentSystemPrompt: string = "";
  private currentThinkingBudget: number | undefined = undefined;
  
  // OpenRouter specific state
  private isOpenRouter: boolean = false;
  private openRouterKey: string = "";
  private openRouterHistory: Array<{ role: string; content: any }> = [];

  constructor() {
    // Validate API Key
    const apiKey = process.env.API_KEY || "";
    
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
        yield "⚠️ Erro de Configuração: API_KEY não encontrada.";
        return;
    }

    // --- OpenRouter Implementation ---
    if (this.isOpenRouter) {
        yield* this.streamOpenRouter(text, imageBase64, mimeType);
        return;
    }

    // --- Google GenAI SDK Implementation ---
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

  private async *streamOpenRouter(text: string, imageBase64?: string, mimeType?: string): AsyncGenerator<string, void, unknown> {
    try {
        // Prepare User Message
        const userContent: any[] = [{ type: "text", text: text }];
        
        if (imageBase64 && mimeType) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`
                }
            });
        }

        const newMessage = { role: "user", content: userContent };
        this.openRouterHistory.push(newMessage);

        // Determine Model
        // Use a Gemini model via OpenRouter for consistency, or a "thinking" model if budget is set
        const model = this.currentThinkingBudget 
            ? "google/gemini-2.0-flash-thinking-exp:free" 
            : "google/gemini-2.0-flash-lite-preview-02-05:free";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.openRouterKey}`,
                "HTTP-Referer": "https://eduia.app", // Required by OpenRouter
                "X-Title": "EduIA",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: this.openRouterHistory,
                stream: true,
                // Some OpenRouter models support reasoning parameters, but we stick to defaults for compatibility
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API Error: ${response.statusText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === "[DONE]") continue;

                    try {
                        const json = JSON.parse(dataStr);
                        const content = json.choices?.[0]?.delta?.content || "";
                        if (content) {
                            fullResponseText += content;
                            yield content;
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        // Append assistant response to history
        this.openRouterHistory.push({ role: "assistant", content: fullResponseText });

    } catch (error: any) {
        console.error("OpenRouter Error:", error);
        yield "Desculpe, ocorreu um erro de conexão com o OpenRouter. Verifique sua chave ou tente novamente.";
    }
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