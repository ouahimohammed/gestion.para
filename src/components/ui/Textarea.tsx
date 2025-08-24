import React, { TextareaHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  charLimit?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    charLimit, 
    resize = 'vertical',
    disabled,
    onChange,
    value,
    ...props 
  }, ref) => {
    const [charCount, setCharCount] = useState(
      typeof value === 'string' ? value.length : 0
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      
      if (charLimit) {
        setCharCount(e.target.value.length);
      }
    };

    const isOverLimit = charLimit ? charCount > charLimit : false;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={props.id} 
            className={cn(
              "block text-sm font-medium mb-2",
              error ? "text-red-600" : "text-gray-700",
              disabled && "text-gray-400"
            )}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            className={cn(
              "flex w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-background",
              "placeholder:text-gray-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              error 
                ? "border-red-500 focus-visible:ring-red-500" 
                : "border-gray-300",
              disabled && "cursor-not-allowed bg-gray-100 opacity-50",
              resize === 'none' && 'resize-none',
              resize === 'both' && 'resize',
              resize === 'horizontal' && 'resize-x',
              resize === 'vertical' && 'resize-y',
              className
            )}
            disabled={disabled}
            onChange={handleChange}
            value={value}
            {...props}
          />
          
          {charLimit && (
            <div className={cn(
              "absolute bottom-2 right-2 text-xs",
              isOverLimit ? "text-red-500" : "text-gray-400"
            )}>
              {charCount}/{charLimit}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "mt-2 text-sm",
            error ? "text-red-600" : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };