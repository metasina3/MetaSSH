import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-slate-900/60 rounded-2xl shadow-lg shadow-black/30 p-6 ${className}`}>
      {children}
    </div>
  );
}

