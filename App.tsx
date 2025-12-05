import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SUBJECTS } from './constants';
import { Subject, ChatMessage, Role } from './types';
import { SubjectCard } from './components/SubjectCard';
import { ChatMessageComponent } from './components/ChatMessage';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubjectSelect = (subject: Subject) => {
    setActiveSubject(subject);
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
    // Initialize the chat service with the new persona and thinking budget
    geminiService.startChat(subject.systemPrompt, subject.thinkingBudget);
    
    // Initial greeting
    const initialMessage: ChatMessage = {
      id: 'init-1',
      role: Role.MODEL,
      text: `Olá! Eu sou sua assistente de **${subject.name}**. Como posso te ajudar hoje?`
    };
    setMessages([initialMessage]);
  };

  const handleBackToHome = () => {
    setActiveSubject(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSendMessage = useCallback(async () => {
    if ((!inputText.trim() && !selectedImage) || isTyping) return;

    const userText = inputText.trim();
    const userImage = selectedImage;

    // Clear inputs immediately
    setInputText('');
    setSelectedImage(null);

    // Add User Message
    const userMsgId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: Role.USER,
      text: userText,
      imageUrl: userImage || undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    // Prepare Model Placeholder
    const modelMsgId = (Date.now() + 1).toString();
    const loadingMessage: ChatMessage = {
      id: modelMsgId,
      role: Role.MODEL,
      text: '',
      isThinking: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
        let fullResponse = "";
        let base64Data = undefined;
        let mimeType = undefined;

        if (userImage) {
            // Extract base64 content and mime type
            // Data URL format: "data:image/jpeg;base64,..."
            const parts = userImage.split(',');
            if (parts.length === 2) {
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch) {
                    mimeType = mimeMatch[1];
                    base64Data = parts[1];
                }
            }
        }

        const stream = geminiService.sendMessageStream(userText, base64Data, mimeType);

        for await (const chunk of stream) {
            fullResponse += chunk;
            
            // Update the message in place
            setMessages(prev => prev.map(msg => 
                msg.id === modelMsgId 
                ? { ...msg, text: fullResponse, isThinking: false } 
                : msg
            ));
        }

    } catch (error) {
        console.error("Error sending message", error);
        setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
            ? { ...msg, text: "Desculpe, ocorreu um erro. Verifique sua conexão e a chave de API.", isThinking: false } 
            : msg
        ));
    } finally {
        setIsTyping(false);
    }
  }, [inputText, isTyping, selectedImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- Views ---

  if (!activeSubject) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.499 5.516 51.597 51.597 0 0 0-2.658.813m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">EduIA</h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">Sua parceira inteligente para os estudos. Escolha uma matéria para começar.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
          {SUBJECTS.map(subject => (
            <SubjectCard 
              key={subject.id} 
              subject={subject} 
              onClick={handleSubjectSelect} 
            />
          ))}
        </div>
        
        <footer className="mt-12 text-sm text-gray-400">
           © 2026 EduIA. Use para aprender.
        </footer>
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBackToHome}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className={`p-2 rounded-lg ${activeSubject.color} text-white`}>
            {activeSubject.icon}
          </div>
          <div>
            <h2 className="font-bold text-gray-800 leading-tight">{activeSubject.name}</h2>
            <p className="text-xs text-green-600 font-medium">Online</p>
          </div>
        </div>
        
        {/* Placeholder for settings or clear chat if needed */}
        <button 
          onClick={() => {
              setMessages([]);
              // Re-initialize to clear history context and re-apply thinking config
              geminiService.startChat(activeSubject.systemPrompt, activeSubject.thinkingBudget);
              const initialMessage: ChatMessage = {
                id: Date.now().toString(),
                role: Role.MODEL,
                text: `Conversa reiniciada! Como posso ajudar em **${activeSubject.name}** agora?`
              };
              setMessages([initialMessage]);
          }}
          className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
        >
          Limpar
        </button>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 bg-gray-50 scrollbar-hide">
        <div className="max-w-3xl mx-auto">
          {messages.map(msg => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-100 p-4 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
            {/* Image Preview in Input */}
            {selectedImage && (
                <div className="relative inline-block mb-3 animate-fade-in-up">
                    <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200 shadow-sm" />
                    <button 
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2 bg-gray-100 p-2 rounded-2xl border border-transparent focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                {/* File Upload Button */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                    title="Enviar foto da tarefa"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                {/* Text Input */}
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Pergunte algo sobre ${activeSubject.name.toLowerCase()}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 max-h-32 text-gray-700 placeholder-gray-400"
                    rows={1}
                    style={{ minHeight: '44px' }}
                />

                {/* Send Button */}
                <button
                    onClick={handleSendMessage}
                    disabled={(!inputText.trim() && !selectedImage) || isTyping}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                        (!inputText.trim() && !selectedImage) || isTyping
                        ? 'bg-gray-200 text-gray-400' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                    }`}
                >
                    {isTyping ? (
                         <div className="w-6 h-6 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;