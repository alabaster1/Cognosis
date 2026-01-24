'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface GridImage {
  url: string | null;
  cid?: string | null;
  displayIndex: number;
}

interface ImageGridProps {
  images: GridImage[];
  onSelect: (displayIndex: number) => void;
  disabled?: boolean;
  selectedIndex?: number | null;
  revealedTargetIndex?: number | null;
}

export default function ImageGrid({
  images,
  onSelect,
  disabled = false,
  selectedIndex = null,
  revealedTargetIndex = null,
}: ImageGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
      {images.map((image, idx) => {
        const isSelected = selectedIndex === image.displayIndex;
        const isTarget = revealedTargetIndex === image.displayIndex;
        const isHovered = hoveredIndex === idx;

        let borderClass = 'border-white/10';
        if (isSelected && isTarget) borderClass = 'border-green-500 ring-2 ring-green-500/50';
        else if (isSelected && !isTarget && revealedTargetIndex !== null) borderClass = 'border-red-500 ring-2 ring-red-500/50';
        else if (isSelected) borderClass = 'border-indigo-500 ring-2 ring-indigo-500/50';
        else if (isTarget) borderClass = 'border-green-500 ring-2 ring-green-500/30';

        return (
          <motion.button
            key={image.displayIndex}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${borderClass} ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
            }`}
            onClick={() => !disabled && onSelect(image.displayIndex)}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
          >
            {image.url ? (
              <img
                src={image.url}
                alt={`Option ${image.displayIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Image {image.displayIndex + 1}</span>
              </div>
            )}

            {/* Selection overlay */}
            {isHovered && !disabled && (
              <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  Select
                </span>
              </div>
            )}

            {/* Index label */}
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{image.displayIndex + 1}</span>
            </div>

            {/* Result indicators */}
            {isSelected && revealedTargetIndex !== null && (
              <div className="absolute top-2 right-2">
                {isTarget ? (
                  <span className="text-green-400 text-lg">&#10003;</span>
                ) : (
                  <span className="text-red-400 text-lg">&#10007;</span>
                )}
              </div>
            )}
            {isTarget && !isSelected && revealedTargetIndex !== null && (
              <div className="absolute bottom-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                Target
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
