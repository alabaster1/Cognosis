'use client';

/**
 * Telepathy Experiment - Refactored with Template
 *
 * BEFORE: ~400 lines of code
 * AFTER: 10 lines of code
 *
 * The template handles all common functionality:
 * - Wallet authentication check
 * - Step navigation (intro → setup → predict → success)
 * - Form validation
 * - API commitment creation
 * - Error handling
 * - Success display
 *
 * The config defines only what makes this experiment unique:
 * - Colors and icons
 * - Setup fields
 * - Copy text
 */

import { CommitmentExperiment } from '@/components/experiments/templates';
import { telepathyConfig } from '@/components/experiments/configs';

export default function TelepathyPage() {
  return <CommitmentExperiment config={telepathyConfig} />;
}
