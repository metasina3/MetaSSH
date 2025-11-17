import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">{title}</h1>
        {description && (
          <p className="text-sm text-slate-400">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

