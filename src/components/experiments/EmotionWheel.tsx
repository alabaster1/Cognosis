'use client';

import { useState } from 'react';

interface EmotionWheelProps {
  onEmotionSelect?: (emotion: string, intensity: number) => void;
  selectedEmotion?: string;
  selectedIntensity?: number;
}

const EMOTIONS = [
  { id: 'joy', name: 'Joy', color: '#FFD700', angle: 0 },
  { id: 'trust', name: 'Trust', color: '#90EE90', angle: 45 },
  { id: 'fear', name: 'Fear', color: '#8B4513', angle: 90 },
  { id: 'surprise', name: 'Surprise', color: '#87CEEB', angle: 135 },
  { id: 'sadness', name: 'Sadness', color: '#4169E1', angle: 180 },
  { id: 'disgust', name: 'Disgust', color: '#9370DB', angle: 225 },
  { id: 'anger', name: 'Anger', color: '#FF4500', angle: 270 },
  { id: 'anticipation', name: 'Anticipation', color: '#FFA500', angle: 315 },
];

const INTENSITIES = [
  { level: 1, name: 'Mild', radius: 80 },
  { level: 2, name: 'Moderate', radius: 60 },
  { level: 3, name: 'Intense', radius: 40 },
];

export default function EmotionWheel({ onEmotionSelect, selectedEmotion, selectedIntensity }: EmotionWheelProps) {
  const [localEmotion, setLocalEmotion] = useState(selectedEmotion || '');
  const [localIntensity, setLocalIntensity] = useState(selectedIntensity || 2);

  const handleSelect = (emotion: string, intensity: number) => {
    setLocalEmotion(emotion);
    setLocalIntensity(intensity);
    onEmotionSelect?.(emotion, intensity);
  };

  const currentEmotion = EMOTIONS.find((e) => e.id === localEmotion);

  return (
    <div className="space-y-6">
      {/* Emotion Wheel Visualization */}
      <div className="relative w-full max-w-md mx-auto aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Background circle */}
          <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#444" strokeWidth="1" />

          {/* Emotion wedges */}
          {EMOTIONS.map((emotion) => {
            const startAngle = (emotion.angle - 22.5) * (Math.PI / 180);
            const endAngle = (emotion.angle + 22.5) * (Math.PI / 180);
            const selected = localEmotion === emotion.id;

            // Create wedge path
            const x1 = 100 + 95 * Math.cos(startAngle);
            const y1 = 100 + 95 * Math.sin(startAngle);
            const x2 = 100 + 95 * Math.cos(endAngle);
            const y2 = 100 + 95 * Math.sin(endAngle);

            const pathD = `M 100,100 L ${x1},${y1} A 95,95 0 0,1 ${x2},${y2} Z`;

            return (
              <g key={emotion.id}>
                <path
                  d={pathD}
                  fill={emotion.color}
                  opacity={selected ? 0.9 : 0.6}
                  stroke={selected ? '#fff' : '#333'}
                  strokeWidth={selected ? 2 : 1}
                  className="cursor-pointer transition-all hover:opacity-100"
                  onClick={() => handleSelect(emotion.id, localIntensity)}
                />
                {/* Label */}
                <text
                  x={100 + 70 * Math.cos(emotion.angle * (Math.PI / 180))}
                  y={100 + 70 * Math.sin(emotion.angle * (Math.PI / 180))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight={selected ? 'bold' : 'normal'}
                  className="pointer-events-none"
                >
                  {emotion.name}
                </text>
              </g>
            );
          })}

          {/* Center circle */}
          <circle cx="100" cy="100" r="30" fill="#000" stroke="#666" strokeWidth="2" />
        </svg>
      </div>

      {/* Intensity Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Intensity</label>
        <div className="flex gap-2">
          {INTENSITIES.map((intensity) => (
            <button
              key={intensity.level}
              onClick={() => handleSelect(localEmotion, intensity.level)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                localIntensity === intensity.level
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-[#1a2535] hover:border-gray-600'
              }`}
            >
              {intensity.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Emotion Display */}
      {currentEmotion && (
        <div className="p-4 rounded-lg border-2 border-[#1a2535] bg-[#0f1520]/80">
          <div className="text-sm text-slate-400">Selected</div>
          <div className="flex items-center gap-3 mt-2">
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: currentEmotion.color }}
            />
            <div>
              <div className="font-semibold">{currentEmotion.name}</div>
              <div className="text-sm text-slate-400">
                {INTENSITIES.find((i) => i.level === localIntensity)?.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
