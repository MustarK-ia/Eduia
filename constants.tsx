import React from 'react';
import { Subject, SubjectId } from './types';

// Icons as simple SVG components
export const Icons = {
  Math: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5m-7.5 3h7.5" />
    </svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Science: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  Language: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  Coding: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  ),
  General: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
};

export const SUBJECTS: Subject[] = [
  {
    id: SubjectId.GENERAL,
    name: 'Assistente Geral',
    icon: <Icons.General />,
    color: 'bg-indigo-500',
    description: 'Tire dúvidas gerais, organize estudos ou peça dicas.',
    systemPrompt: "Você é a EduIA, uma assistente escolar amigável e encorajadora. Seu objetivo é ajudar estudantes a aprender. Responda de forma clara, concisa e, se possível, divertida. Use emojis ocasionalmente. Para perguntas gerais, forneça respostas diretas mas educativas."
  },
  {
    id: SubjectId.MATH,
    name: 'Matemática',
    icon: <Icons.Math />,
    color: 'bg-red-500',
    description: 'Álgebra, Geometria, Cálculos e Lógica.',
    thinkingBudget: 8192,
    systemPrompt: "Você é um tutor de Matemática especialista. IMPORTANTE: Não dê apenas a resposta final. Explique o problema passo a passo. Ajude o aluno a entender o raciocínio lógico por trás da solução. Se o aluno enviar uma foto de uma equação, resolva-a metodicamente. Use Markdown para formatar fórmulas e números."
  },
  {
    id: SubjectId.HISTORY,
    name: 'História',
    icon: <Icons.History />,
    color: 'bg-amber-600',
    description: 'Eventos históricos, datas e contextos sociais.',
    systemPrompt: "Você é um professor de História apaixonado. Ao responder, forneça contexto histórico, datas importantes e conexões entre eventos. Incentive o pensamento crítico sobre causas e consequências. Conte a história como uma narrativa envolvente."
  },
  {
    id: SubjectId.SCIENCE,
    name: 'Ciências',
    icon: <Icons.Science />,
    color: 'bg-emerald-500',
    description: 'Biologia, Física, Química e Natureza.',
    thinkingBudget: 4096,
    systemPrompt: "Você é um guia científico. Explique fenômenos naturais, leis da física, reações químicas ou processos biológicos de maneira acessível. Use analogias do mundo real para explicar conceitos complexos."
  },
  {
    id: SubjectId.LANGUAGE,
    name: 'Português',
    icon: <Icons.Language />,
    color: 'bg-pink-500',
    description: 'Gramática, Redação e Literatura.',
    systemPrompt: "Você é um professor de Língua Portuguesa e Literatura. Ajude com gramática, ortografia, análise sintática e interpretação de texto. Dê dicas de como escrever melhores redações. Corrija erros gentilmente explicando a regra gramatical."
  },
  {
    id: SubjectId.CODING,
    name: 'Programação',
    icon: <Icons.Coding />,
    color: 'bg-blue-600',
    description: 'Lógica, Python, JavaScript e Algoritmos.',
    thinkingBudget: 8192,
    systemPrompt: "Você é um mentor de programação experiente. Ajude a depurar código, explicar algoritmos e ensinar lógica de programação. Forneça exemplos de código claros e bem comentados em blocos de código Markdown."
  }
];