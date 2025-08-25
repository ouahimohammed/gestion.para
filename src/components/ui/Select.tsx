import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  disabled,
  placeholder = "Sélectionner...",
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectRef = useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  const selectedChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.props.value === currentValue
  );

  // Fermer le select quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)} ref={selectRef}>
      <button
        type="button"
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-all duration-200',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
          isOpen && 'ring-2 ring-indigo-500 border-indigo-500'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate text-gray-900">
          {React.isValidElement(selectedChild) ? selectedChild.props.children : placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform duration-200", 
            isOpen && "transform rotate-180"
          )} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in-80 slide-in-from-top-2">
          <div className="py-2 max-h-60 overflow-auto">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  onSelect: () => handleValueChange(child.props.value),
                  isSelected: child.props.value === currentValue,
                } as any);
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SelectTrigger({ children, className, id }: SelectTriggerProps) {
  return (
    <button
      id={id}
      className={cn(
        'flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-all duration-200',
        'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
        className
      )}
      aria-haspopup="listbox"
    >
      {children}
      <ChevronDown className="h-4 w-4 text-gray-500" />
    </button>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  position?: 'popper' | 'item-aligned';
}

export function SelectContent({ children, className, position = 'popper' }: SelectContentProps) {
  return (
    <div
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in-80',
        position === 'popper' && 'translate-y-1',
        className
      )}
    >
      <div className="py-2">{children}</div>
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function SelectItem({
  value,
  children,
  className,
  disabled,
  onSelect,
  isSelected,
}: SelectItemProps) {
  return (
    <div
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center py-3 pl-3 pr-9 text-sm outline-none transition-colors duration-150',
        'hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700',
        isSelected && 'bg-indigo-50 text-indigo-700 font-medium',
        disabled && 'pointer-events-none opacity-50 text-gray-400',
        className
      )}
      onClick={disabled ? undefined : onSelect}
      role="option"
      aria-selected={isSelected}
    >
      {children}
      {isSelected && (
        <span className="absolute right-3 flex h-4 w-4 items-center justify-center text-indigo-600">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

export function SelectValue({ placeholder = "Sélectionner...", children }: SelectValueProps) {
  return <span className={cn(!children && "text-gray-500")}>{children || placeholder}</span>;
}

interface SelectGroupProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function SelectGroup({ children, className, label }: SelectGroupProps) {
  return (
    <div className={cn('py-1', className)} role="group" aria-label={label}>
      {label && (
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
