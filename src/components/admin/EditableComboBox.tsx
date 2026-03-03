import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface EditableComboBoxProps {
  value: string | null;
  options: Option[];
  onChange: (value: string | null, isNew: boolean, newLabel?: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export function EditableComboBox({
  value,
  options,
  onChange,
  placeholder = 'Select or type...',
  allowCustom = true
}: EditableComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.id === value);
    if (selectedOption) {
      setInputValue(selectedOption.label);
      setIsCreatingNew(false);
    } else if (value === 'new' || !value) {
      setInputValue('');
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    const exactMatch = options.find(
      opt => opt.label.toLowerCase() === newValue.toLowerCase()
    );

    if (!exactMatch && newValue.trim()) {
      setIsCreatingNew(true);
    } else {
      setIsCreatingNew(false);
    }
  };

  const handleSelectOption = (optionId: string) => {
    const option = options.find(opt => opt.id === optionId);
    if (option) {
      setInputValue(option.label);
      onChange(optionId, false);
      setIsCreatingNew(false);
    }
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onChange(null, true, inputValue.trim());
      setIsCreatingNew(true);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const exactMatch = options.find(
        opt => opt.label.toLowerCase() === inputValue.toLowerCase()
      );

      if (exactMatch) {
        handleSelectOption(exactMatch.id);
      } else if (allowCustom) {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange(null, false);
    setIsCreatingNew(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-2 py-1 pr-16 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.id)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-900 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {allowCustom && inputValue.trim() && !options.find(opt => opt.label.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left text-sm bg-green-50 hover:bg-green-100 text-green-900 border-t border-green-200 flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create: {inputValue}
            </button>
          )}

          {filteredOptions.length === 0 && (!allowCustom || !inputValue.trim()) && (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">
              {inputValue ? 'No matches found' : 'Start typing to search'}
            </div>
          )}
        </div>
      )}

      {isCreatingNew && inputValue && (
        <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          Will create new entry
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
