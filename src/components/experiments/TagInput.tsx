'use client';

import { useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function TagInput({
  tags,
  onTagsChange,
  maxTags = 3,
  placeholder = 'Type a word or phrase and press Enter...',
  label = 'Descriptive Tags',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && tags.length < maxTags && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    if (!disabled) {
      onTagsChange(tags.filter((_, i) => i !== index));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label} ({tags.length}/{maxTags})
      </label>

      {/* Tag display */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-sm border border-indigo-500/30"
            >
              {tag}
              {!disabled && (
                <button
                  onClick={() => removeTag(index)}
                  className="ml-1 text-indigo-400 hover:text-indigo-200 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      {!disabled && tags.length < maxTags && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          maxLength={50}
        />
      )}

      {tags.length >= maxTags && !disabled && (
        <p className="text-xs text-green-400 mt-1">
          All {maxTags} tags provided
        </p>
      )}
    </div>
  );
}
