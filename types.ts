import React from 'react';

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  imageUrl?: string;
  isThinking?: boolean;
}

export enum SubjectId {
  GENERAL = 'general',
  MATH = 'math',
  HISTORY = 'history',
  SCIENCE = 'science',
  LANGUAGE = 'language',
  CODING = 'coding'
}

export interface Subject {
  id: SubjectId;
  name: string;
  icon: React.ReactNode;
  color: string;
  systemPrompt: string;
  description: string;
  thinkingBudget?: number;
}