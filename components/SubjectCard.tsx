import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onClick: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  return (
    <button
      onClick={() => onClick(subject)}
      className="flex flex-col items-start p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 group w-full text-left"
    >
      <div className={`p-3 rounded-lg ${subject.color} text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
        {subject.icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{subject.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{subject.description}</p>
    </button>
  );
};