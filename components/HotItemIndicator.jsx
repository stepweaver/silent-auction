'use client';

export default function HotItemIndicator({ size = 'sm' }) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-lg'
  };
  const sizeClass = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className="relative inline-flex items-center justify-center">
      <span className={`${sizeClass} animate-pulse`}>🔥</span>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`${sizeClass} opacity-60 animate-ping`}>🔥</span>
      </div>
    </div>
  );
}

