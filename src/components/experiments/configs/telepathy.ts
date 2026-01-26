/**
 * Telepathy Experiment Configuration
 */

import { Users } from 'lucide-react';
import type { CommitmentExperimentConfig } from '../templates/types';

export const telepathyConfig: CommitmentExperimentConfig = {
  experimentType: 'telepathy',
  title: 'Telepathy',
  subtitle: 'Test mind-to-mind communication',
  icon: Users,
  theme: {
    gradient: { from: 'green-500', to: 'teal-500' },
    accent: 'green',
  },
  howItWorks: [
    {
      title: 'Choose a Session',
      description: 'Select session type (one-on-one, group, long-distance) and target date',
    },
    {
      title: 'Receive Impressions',
      description: 'Record the thoughts, images, or impressions you received from another mind',
    },
    {
      title: 'Commit to Blockchain',
      description: 'Your impressions are encrypted and timestamped immutably',
    },
    {
      title: 'Check Accuracy',
      description: 'Compare your impressions with what was actually transmitted',
    },
  ],
  setup: {
    fields: [
      {
        id: 'targetDate',
        label: 'Target Date',
        type: 'date',
        required: true,
      },
      {
        id: 'sessionType',
        label: 'Session Type',
        type: 'select',
        placeholder: 'Select session type...',
        required: true,
        options: [
          { value: 'one-on-one', label: 'One-on-One' },
          { value: 'group', label: 'Group Session' },
          { value: 'long-distance', label: 'Long Distance' },
          { value: 'dream', label: 'Dream Telepathy' },
        ],
      },
    ],
  },
  predict: {
    label: 'Your Impressions',
    placeholder: 'Describe the thoughts, images, emotions, or sensations you received...',
    helperText: 'Be as detailed as possible. Include colors, shapes, feelings, and any other sensory information.',
    minLength: 10,
  },
  success: {
    heading: 'Impressions Committed!',
    achievements: [
      'Encrypted with AES-256-GCM',
      'Timestamped on blockchain',
      'Ready for verification',
    ],
  },
};
