import React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function Tooltip({
  children,
  content,
  delayDuration = 200,
  side = 'top',
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 max-w-xs rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95',
            {
              'bottom-full left-1/2 -translate-x-1/2 mb-2': side === 'top',
              'left-full top-1/2 -translate-y-1/2 ml-2': side === 'right',
              'top-full left-1/2 -translate-x-1/2 mt-2': side === 'bottom',
              'right-full top-1/2 -translate-y-1/2 mr-2': side === 'left',
            },
            className
          )}
          style={{
            pointerEvents: 'none',
          }}
        >
          {content}
          <div
            className={cn(
              'absolute h-2 w-2 rotate-45 bg-gray-900',
              {
                '-bottom-1 left-1/2 -translate-x-1/2': side === 'top',
                '-left-1 top-1/2 -translate-y-1/2': side === 'right',
                '-top-1 left-1/2 -translate-x-1/2': side === 'bottom',
                '-right-1 top-1/2 -translate-y-1/2': side === 'left',
              }
            )}
          />
        </div>
      )}
    </div>
  );
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-gray-900 text-white px-3 py-1.5 rounded-md text-sm', className)}>
      {children}
    </div>
  );
}