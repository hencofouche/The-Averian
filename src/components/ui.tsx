import React from 'react';
import { cn } from '../lib/utils';
import { Bird, Cage } from '../types';

export const Button = ({ children, className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-gold-500 text-black-950 hover:bg-gold-600 shadow-lg shadow-gold-500/20',
    secondary: 'bg-zinc-800 text-gold-500 hover:bg-zinc-700 border border-gold-500/30',
    danger: 'bg-zinc-900/80 text-white rounded-lg transition-all',
    ghost: 'bg-transparent text-black-50 hover:bg-black-900 hover:text-gold-500',
  };
  
  const customDangerStyle: React.CSSProperties = variant === 'danger' ? {
    backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)',
    color: 'var(--theme-delete-color, #ef4444)',
    borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 70%)',
    borderWidth: '1px'
  } : {};

  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-[clamp(10px,1.2vw,14px)] uppercase tracking-widest', variants[variant], className)} 
      style={customDangerStyle}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className, id, name, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => { 
  const generatedId = React.useId(); 
  return ( 
    <input id={id || generatedId} name={name || id || generatedId} className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all placeholder:text-white/30 text-sm font-medium', className)} {...props} /> 
  ); 
};

export const Select = ({ className, children, id, name, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => { 
  const generatedId = React.useId(); 
  return ( 
    <select id={id || generatedId} name={name || id || generatedId} className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all appearance-none text-sm font-medium', className)} {...props} > 
      {children} 
    </select> 
  ); 
};

export const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-black-950 border border-black-700 rounded-2xl overflow-hidden shadow-2xl w-full', className)} {...props}>
    {children}
  </div>
);

export const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-xl border border-black-700 bg-black px-3 py-2 text-sm text-white ring-offset-black placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

export const BirdCompactInfo = ({ bird, cages, className, onClick }: { bird: Bird, cages: Cage[], className?: string, onClick?: () => void }) => {
  return (
    <div onClick={onClick} className={cn("flex items-center gap-3 p-2 bg-black-900 rounded-lg border border-black-800", className, onClick && "cursor-pointer hover:bg-black-800 transition-colors")}>
      <div className="w-8 h-8 bg-zinc-800 rounded-md overflow-hidden shrink-0">
        {(bird.imageUrls?.[0] || bird.imageUrl) ? (
          <img src={bird.imageUrls?.[0] || bird.imageUrl} alt={bird.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-white/30 text-[10px] uppercase tracking-widest">{bird.sex === 'Male' ? 'M' : bird.sex === 'Female' ? 'F' : '?'}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold truncate">{bird.name}</p>
        <p className="text-black-100 text-[9px] uppercase tracking-widest truncate">{bird.species} {bird.subSpecies ? `- ${bird.subSpecies}` : ''}</p>
      </div>
    </div>
  );
};

export const Badge = ({ children, className, variant = 'default', style }: { children: React.ReactNode, className?: string, variant?: 'default' | 'destructive' | 'male' | 'female' | 'neutral' | 'success' | 'info' | 'warning', style?: React.CSSProperties }) => {
  if (variant === 'destructive') {
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner", className)} style={{ backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)', color: 'var(--theme-delete-color, #ef4444)', borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 70%)', ...style }}>{children}</span>
    );
  }
  const customStyle: React.CSSProperties = { ...style };
  if (variant === 'male') {
    customStyle.backgroundColor = 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 80%)';
    customStyle.color = 'var(--theme-male-color, #60a5fa)';
    customStyle.borderColor = 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 70%)';
  } else if (variant === 'female') {
    customStyle.backgroundColor = 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 80%)';
    customStyle.color = 'var(--theme-female-color, #fb7185)';
    customStyle.borderColor = 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 70%)';
  }
  return <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-white', className)} style={customStyle}>{children}</span>;
};
