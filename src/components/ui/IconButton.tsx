import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export default function IconButton({
  icon: Icon,
  onClick,
  title,
  variant = 'default',
  disabled = false,
  className = '',
}: IconButtonProps) {
  const baseClasses = 'rounded-full p-2 transition-colors';
  const variantClasses = {
    default: 'text-slate-200 hover:bg-slate-700 hover:text-slate-100',
    primary: 'text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300',
    danger: 'text-red-400 hover:bg-red-500/20 hover:text-red-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

