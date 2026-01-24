'use client';

import { useRef, useState, useEffect } from 'react';
import { Undo, Trash2 } from 'lucide-react';

interface SketchCanvasProps {
  onSketchChange?: (data: string) => void;
  width?: number;
  height?: number;
}

const COLORS = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'red', name: 'Red', hex: '#FF0000' },
  { id: 'blue', name: 'Blue', hex: '#0000FF' },
  { id: 'green', name: 'Green', hex: '#00FF00' },
  { id: 'yellow', name: 'Yellow', hex: '#FFFF00' },
  { id: 'purple', name: 'Purple', hex: '#9370DB' },
  { id: 'orange', name: 'Orange', hex: '#FF8800' },
  { id: 'brown', name: 'Brown', hex: '#8B4513' },
];

export default function SketchCanvas({ onSketchChange, width = 600, height = 400 }: SketchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [paths, setPaths] = useState<Array<{ color: string; points: Array<{ x: number; y: number }> }>>([]);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Redraw all paths
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.strokeStyle = path.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);

      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }

      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length > 1) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);

      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }

      ctx.stroke();
    }
  }, [paths, currentPath, currentColor, width, height]);

  useEffect(() => {
    // Emit sketch data when paths change
    if (onSketchChange && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      onSketchChange(dataUrl);
    }
  }, [paths, onSketchChange]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPath((prev) => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      setPaths((prev) => [...prev, { color: currentColor, points: currentPath }]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  return (
    <div className="space-y-4">
      {/* Color Palette */}
      <div className="flex gap-2 flex-wrap">
        {COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setCurrentColor(color.hex)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              currentColor === color.hex ? 'border-white scale-110' : 'border-gray-600'
            }`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="border-2 border-[#1a2535] rounded-lg cursor-crosshair bg-white"
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={paths.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#142030] rounded-lg hover:bg-[#1a2535] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Undo className="w-4 h-4" />
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={paths.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/50 rounded-lg hover:bg-red-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
