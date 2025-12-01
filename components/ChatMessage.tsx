import React from 'react';
import { ChatMessage, Role } from '../types';
import { marked } from 'marked';

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  // Convert markdown to HTML
  const getMarkdownText = (text: string) => {
    try {
      const rawMarkup = marked.parse(text);
      return { __html: rawMarkup };
    } catch (e) {
      return { __html: text };
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {isUser ? 'EU' : 'IA'}
        </div>

        {/* Bubble */}
        <div className={`px-5 py-4 rounded-2xl shadow-sm overflow-hidden ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
        }`}>
          {/* Attached Image Preview */}
          {message.imageUrl && (
            <div className="mb-3">
              <img 
                src={message.imageUrl} 
                alt="Upload do usuário" 
                className="max-h-48 rounded-lg object-cover border border-white/20"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="text-sm md:text-base leading-relaxed">
            {message.isThinking ? (
              <div className="flex items-center gap-2 text-gray-400 italic">
                <span className="animate-pulse">Pensando</span>
                <span className="flex gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            ) : (
              <div 
                className={`markdown-body ${isUser ? 'text-white' : 'text-gray-800'}`}
                // Using dangerouslySetInnerHTML to render markdown
                dangerouslySetInnerHTML={getMarkdownText(message.text)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};