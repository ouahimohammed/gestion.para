import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Context pour gérer l'état du dropdown
const DropdownMenuContext = React.createContext({
  open: false,
  setOpen: (open: boolean) => {},
  triggerRef: { current: null } as React.RefObject<HTMLDivElement>,
});

// Hook personnalisé pour fermer le dropdown en cliquant à l'extérieur
const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

// Composant principal DropdownMenu
export const DropdownMenu = ({ children, ...props }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block text-left" {...props}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

// Trigger du dropdown
export const DropdownMenuTrigger = ({ children, className = '', ...props }: { children: React.ReactNode, className?: string }) => {
  const { setOpen, open, triggerRef } = React.useContext(DropdownMenuContext);

  return (
    <div
      ref={triggerRef}
      className={`inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </div>
  );
};

// Contenu du dropdown
export const DropdownMenuContent = ({ 
  children, 
  align = 'left', 
  className = '' 
}: { 
  children: React.ReactNode, 
  align?: 'left' | 'right' | 'center',
  className?: string 
}) => {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext);
  const contentRef = useRef<HTMLDivElement>(null);

  useClickOutside(contentRef, () => setOpen(false));

  // Calculer la position du dropdown
  useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      
      // Ajuster la position si nécessaire pour éviter de dépasser de l'écran
      if (align === 'right') {
        contentRef.current.style.right = '0';
        contentRef.current.style.left = 'auto';
      } else if (align === 'center') {
        contentRef.current.style.left = '50%';
        contentRef.current.style.transform = 'translateX(-50%)';
      } else {
        contentRef.current.style.left = '0';
        contentRef.current.style.right = 'auto';
      }

      // Vérifier si le contenu dépasse en bas de l'écran
      if (triggerRect.bottom + contentRect.height > window.innerHeight) {
        contentRef.current.style.top = 'auto';
        contentRef.current.style.bottom = '100%';
        contentRef.current.style.marginBottom = '8px';
      } else {
        contentRef.current.style.top = '100%';
        contentRef.current.style.bottom = 'auto';
        contentRef.current.style.marginTop = '8px';
      }
    }
  }, [open, align, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}
      style={{ minWidth: 'max-content' }}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  );
};

// Groupe d'items dans le dropdown
export const DropdownMenuGroup = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Item du dropdown
export const DropdownMenuItem = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false
}: { 
  children: React.ReactNode, 
  onClick?: () => void,
  className?: string,
  disabled?: boolean
}) => {
  const { setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = () => {
    if (disabled) return;
    if (onClick) onClick();
    setOpen(false);
  };

  return (
    <button
      className={`${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'} group flex w-full items-center px-4 py-2 text-sm ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Label dans le dropdown
export const DropdownMenuLabel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`px-4 py-2 text-xs font-medium text-gray-500 ${className}`}>
      {children}
    </div>
  );
};

// Séparateur dans le dropdown
export const DropdownMenuSeparator = ({ className = '' }: { className?: string }) => {
  return (
    <hr className={`my-1 border-gray-200 ${className}`} />
  );
};