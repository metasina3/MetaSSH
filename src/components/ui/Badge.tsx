import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'gray';
  className?: string;
}

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  const variantClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    gray: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

