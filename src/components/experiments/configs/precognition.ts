/**
 * Precognition Experiment Configuration
 */

import { Zap } from 'lucide-react';
import type { CommitmentExperimentConfig } from '../templates/types';

export const precognitionConfig: CommitmentExperimentConfig = {
  experimentType: 'precognition',
  title: 'Precognition',
  subtitle: 'Predict future events before they happen',
  icon: Zap,
  theme: {
    gradient: { from: 'blue-500', to: 'cyan-500' },
    accent: 'blue',
  },
  howItWorks: [
    {
      title: 'Choose an Event',
      description: 'Select a future date and type of event to predict (news, sports, weather, etc.)',
    },
    {
      title: 'Make Your Prediction',
      description: 'Write down what you predict will happen on that date',
    },
    {
      title: 'Commit to Blockchain',
      description: 'Your prediction is encrypted and timestamped immutably',
    },
    {
      title: 'Check Accuracy',
      description: 'After the event occurs, reveal and compare your prediction with reality',
    },
  ],
  setup: {
    fields: [
      {
        id: 'targetDate',
        label: 'Target Date',
        type: 'date',
        required: true,
        helperText: 'The date of the event you are predicting',
      },
      {
        id: 'eventType',
        label: 'Event Type',
        type: 'select',
        placeholder: 'Select event type...',
        required: true,
        options: [
          { value: 'news', label: 'News Event' },
          { value: 'sports', label: 'Sports Outcome' },
          { value: 'weather', label: 'Weather' },
          { value: 'personal', label: 'Personal Event' },
          { value: 'financial', label: 'Financial/Market' },
          { value: 'other', label: 'Other' },
        ],
      },
    ],
  },
  predict: {
    label: 'Your Prediction',
    placeholder: 'Describe what you predict will happen on the target date...',
    helperText: 'Be specific and detailed. Include names, numbers, locations if possible.',
    minLength: 20,
  },
  success: {
    heading: 'Prediction Committed!',
    achievements: [
      'Encrypted with AES-256-GCM',
      'Timestamped on blockchain',
      'Ready for future verification',
    ],
  },
};
