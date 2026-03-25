import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface MultiSelectProps {
  label: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  activeColor?: 'orange' | 'sky' | 'blue';
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "TODOS",
  className,
  activeColor = "orange"
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "TODOS";
    if (selectedValues.length <= 2) {
      return selectedValues.map(v => options.find(o => o.value === v)?.label || v).join(', ');
    }
    return `${selectedValues.length} SELECIONADOS`;
  };

  const colorClasses = {
    orange: "focus:ring-orange-500/20 text-orange-500",
    sky: "focus:ring-sky-500/20 text-sky-500",
    blue: "focus:ring-blue-500/20 text-blue-500"
  }[activeColor] || "focus:ring-orange-500/20 text-orange-500";

  const activeBgClasses = {
    orange: "bg-orange-50 text-orange-600",
    sky: "bg-sky-50 text-sky-600",
    blue: "bg-blue-50 text-blue-600"
  }[activeColor] || "bg-orange-50 text-orange-600";

  return (
    <div className={cn("flex items-center gap-1.5 relative", className)} ref={containerRef}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0">{label}:</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-2 min-w-[80px] hover:bg-slate-100 transition-all",
          isOpen && "ring-2 ring-offset-0 " + colorClasses.split(' ')[0]
        )}
      >
        <span className="truncate max-w-[120px]">{getDisplayText()}</span>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {selectedValues.length > 0 && (
            <X 
              size={10} 
              className="text-slate-400 hover:text-red-500" 
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }} 
            />
          )}
          <ChevronDown size={12} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-[240px] overflow-y-auto custom-scrollbar">
          <div 
            onClick={() => onChange([])}
            className={cn(
              "px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between hover:bg-slate-50",
              selectedValues.length === 0 && activeBgClasses
            )}
          >
            TODOS
            {selectedValues.length === 0 && <Check size={12} />}
          </div>
          <div className="h-px bg-slate-100 my-1" />
          {options.map(option => (
            <div 
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className={cn(
                "px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center justify-between hover:bg-slate-50",
                selectedValues.includes(option.value) && activeBgClasses
              )}
            >
              {option.label}
              {selectedValues.includes(option.value) && <Check size={12} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
