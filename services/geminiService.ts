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
          
          // Yield Search Grounding Metadata if present (to show sources)
          if (c.candidates?.[0]?.groundingMetadata) {
             const metadata = JSON.stringify({ groundingMetadata: c.candidates[0].groundingMetadata });
             // We yield a special marker that the UI can parse, or just attach it to the final object.
             // For simplicity in this stream, we will just handle text, but strictly speaking 
             // the UI should handle this. Let's keep it simple for now and just yield text.
          }

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
        // Use a model that supports free tier and reasoning/thinking if possible
        const model = this.currentThinkingBudget 
            ? "google/gemini-2.0-flash-thinking-exp:free" 
            : "google/gemini-2.0-pro-exp-02-05:free";

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
                messages: this.openRouterHistory, // Sends history WITH previous reasoning_details
                stream: true,
                // Activate reasoning as requested
                reasoning: { enabled: true } 
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
        let fullReasoningDetails: any = null; // To accumulate reasoning details

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
                        const delta = json.choices?.[0]?.delta;

                        // 1. Handle Content Streaming
                        const content = delta?.content || "";
                        if (content) {
                            fullResponseText += content;
                            yield content;
                        }

                        // 2. Handle Reasoning Details Streaming/Accumulation
                        // Some providers stream it, some send it at the end. 
                        // We check for the field in the delta.
                        if (delta?.reasoning_details) {
                            if (typeof delta.reasoning_details === 'string') {
                                // If it's a string accumulation
                                fullReasoningDetails = (fullReasoningDetails || "") + delta.reasoning_details;
                            } else {
                                // If it's an object update (less common in stream but possible)
                                fullReasoningDetails = delta.reasoning_details;
                            }
                        }

                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        // Append assistant response to history
        // CRITICAL: We pass back the reasoning_details so the next request includes them
        const assistantMessage: any = { 
            role: "assistant", 
            content: fullResponseText 
        };

        if (fullReasoningDetails) {
            assistantMessage.reasoning_details = fullReasoningDetails;
        }

        this.openRouterHistory.push(assistantMessage);

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