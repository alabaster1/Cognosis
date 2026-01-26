/**
 * Intuition Experiment Configuration
 */

import { Brain } from 'lucide-react';
import type { CommitmentExperimentConfig } from '../templates/types';

export const intuitionConfig: CommitmentExperimentConfig = {
  experimentType: 'intuition',
  title: 'Intuition',
  subtitle: 'Test your gut feelings and hunches',
  icon: Brain,
  theme: {
    gradient: { from: 'amber-500', to: 'orange-500' },
    accent: 'amber',
  },
  howItWorks: [
    {
      title: 'Identify a Decision',
      description: 'Choose a situation where you have a strong gut feeling about the outcome',
    },
    {
      title: 'Record Your Hunch',
      description: 'Document your intuitive sense about what will happen',
    },
    {
      title: 'Commit to Blockchain',
      description: 'Your intuition is encrypted and timestamped immutably',
    },
    {
      title: 'Verify Results',
      description: 'Check how accurate your intuition was after the outcome is known',
    },
  ],
  setup: {
    fields: [
      {
        id: 'targetDate',
        label: 'Expected Resolution Date',
        type: 'date',
        required: true,
        helperText: 'When do you expect to know the outcome?',
      },
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'Select category...',
        required: true,
        options: [
          { value: 'relationship', label: 'Relationship' },
          { value: 'career', label: 'Career/Work' },
          { value: 'health', label: 'Health' },
          { value: 'financial', label: 'Financial' },
          { value: 'decision', label: 'Decision/Choice' },
          { value: 'social', label: 'Social Situation' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'confidence',
        label: 'Confidence Level',
        type: 'select',
        placeholder: 'How strong is your hunch?',
        required: true,
        options: [
          { value: 'very-strong', label: 'Very Strong (90%+ certain)' },
          { value: 'strong', label: 'Strong (70-89%)' },
          { value: 'moderate', label: 'Moderate (50-69%)' },
          { value: 'slight', label: 'Slight (below 50%)' },
        ],
      },
    ],
  },
  predict: {
    label: 'Your Intuition',
    placeholder: 'Describe the situation and your gut feeling about the outcome...',
    helperText: 'Explain the context and what your intuition is telling you. Include any physical sensations or feelings.',
    minLength: 30,
  },
  success: {
    heading: 'Intuition Recorded!',
    achievements: [
      'Encrypted with AES-256-GCM',
      'Timestamped on blockchain',
      'Ready for verification',
    ],
  },
};
