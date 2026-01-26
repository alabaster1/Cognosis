/**
 * Experiment Template Types
 * Configuration-driven experiment page generation
 */

import { LucideIcon } from 'lucide-react';

/**
 * Color theme configuration
 */
export interface ExperimentTheme {
  /** Primary gradient colors: from-{color1} to-{color2} */
  gradient: {
    from: string;
    to: string;
  };
  /** Accent color for highlights (e.g., bg-{accent}-500/20, text-{accent}-400) */
  accent: string;
}

/**
 * Setup field configuration
 */
export interface SetupField {
  /** Field identifier */
  id: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'date' | 'select' | 'text' | 'textarea';
  /** Placeholder text */
  placeholder?: string;
  /** Required field */
  required?: boolean;
  /** Options for select fields */
  options?: { value: string; label: string }[];
  /** Helper text below the field */
  helperText?: string;
}

/**
 * How-it-works step
 */
export interface HowItWorksStep {
  title: string;
  description: string;
}

/**
 * Commitment-based experiment configuration
 * For experiments that follow: intro → setup → predict → success
 */
export interface CommitmentExperimentConfig {
  /** Experiment type identifier (used in API calls) */
  experimentType: string;

  /** Display title */
  title: string;

  /** Short subtitle/tagline */
  subtitle: string;

  /** Lucide icon component */
  icon: LucideIcon;

  /** Color theme */
  theme: ExperimentTheme;

  /** How it works steps (shown on intro page) */
  howItWorks: HowItWorksStep[];

  /** Setup step configuration */
  setup: {
    /** Title for the setup step */
    title?: string;
    /** Setup fields to collect before prediction */
    fields: SetupField[];
  };

  /** Prediction step configuration */
  predict: {
    /** Title for the predict step */
    title?: string;
    /** Label for the prediction textarea */
    label: string;
    /** Placeholder for the prediction textarea */
    placeholder: string;
    /** Helper text below the textarea */
    helperText?: string;
    /** Minimum characters required */
    minLength?: number;
  };

  /** Success screen configuration */
  success: {
    /** Main heading after successful commit */
    heading: string;
    /** Achievement bullets to show */
    achievements: string[];
  };

  /** Optional: custom metadata builder */
  buildMetadata?: (values: Record<string, string>, prediction: string) => Record<string, unknown>;
}

/**
 * Default metadata builder
 */
export function defaultMetadataBuilder(
  config: CommitmentExperimentConfig,
  values: Record<string, string>,
  prediction: string
): Record<string, unknown> {
  const targetDate = values.targetDate || values.date;
  const primaryField = Object.keys(values).find(k => k !== 'targetDate' && k !== 'date');
  const primaryValue = primaryField ? values[primaryField] : '';

  return {
    type: config.experimentType,
    title: `${config.title}: ${primaryValue || 'Session'}`,
    description: targetDate ? `Target date: ${targetDate}` : prediction.substring(0, 100),
    targetDate,
    category: config.experimentType,
    tags: [config.experimentType, primaryValue].filter(Boolean),
    ...values,
  };
}
