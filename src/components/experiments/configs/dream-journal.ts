/**
 * Dream Journal Experiment Configuration
 */

import { Moon } from 'lucide-react';
import type { CommitmentExperimentConfig } from '../templates/types';

export const dreamJournalConfig: CommitmentExperimentConfig = {
  experimentType: 'dream-journal',
  title: 'Dream Journal',
  subtitle: 'Record and verify precognitive dreams',
  icon: Moon,
  theme: {
    gradient: { from: 'indigo-500', to: 'purple-500' },
    accent: 'indigo',
  },
  howItWorks: [
    {
      title: 'Record Your Dream',
      description: 'Write down your dream immediately upon waking, capturing all details',
    },
    {
      title: 'Set Verification Date',
      description: 'Choose a future date when the dream\'s accuracy can be verified',
    },
    {
      title: 'Commit to Blockchain',
      description: 'Your dream is encrypted and timestamped immutably',
    },
    {
      title: 'Verify Later',
      description: 'Check if events in your dream came true on or before the verification date',
    },
  ],
  setup: {
    fields: [
      {
        id: 'dreamDate',
        label: 'Dream Date',
        type: 'date',
        required: true,
        helperText: 'When did you have this dream?',
      },
      {
        id: 'verificationDate',
        label: 'Verification Date',
        type: 'date',
        required: true,
        helperText: 'When should this dream be verified?',
      },
      {
        id: 'dreamType',
        label: 'Dream Type',
        type: 'select',
        placeholder: 'Select dream type...',
        required: true,
        options: [
          { value: 'precognitive', label: 'Precognitive (future event)' },
          { value: 'telepathic', label: 'Telepathic (shared experience)' },
          { value: 'lucid', label: 'Lucid Dream' },
          { value: 'symbolic', label: 'Symbolic/Prophetic' },
          { value: 'other', label: 'Other' },
        ],
      },
    ],
  },
  predict: {
    title: 'Record Your Dream',
    label: 'Dream Description',
    placeholder: 'Describe your dream in as much detail as possible. Include people, places, events, emotions, colors, symbols...',
    helperText: 'Record everything you remember, even if it seems insignificant. Details often become meaningful later.',
    minLength: 50,
  },
  success: {
    heading: 'Dream Recorded!',
    achievements: [
      'Encrypted with AES-256-GCM',
      'Timestamped on blockchain',
      'Ready for future verification',
    ],
  },
};
