'use client';

/**
 * Generic Reveal Modal
 * Reusable component for revealing experiment results with cryptographic verification
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, CheckCircle, AlertCircle, TrendingUp, Hash, Lock } from 'lucide-react';
import { ReactNode } from 'react';

interface RevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  experimentType: string;
  children: ReactNode;
  confirmText?: string;
  confirmDisabled?: boolean;
  isLoading?: boolean;
  showVerification?: boolean;
  verificationData?: {
    commitmentId?: string;
    commitmentHash?: string;
    nonce?: string;
    ipfsCID?: string;
    timestamp?: string;
  };
}

export default function RevealModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  experimentType,
  children,
  confirmText = 'Continue',
  confirmDisabled = false,
  isLoading = false,
  showVerification = false,
  verificationData
}: RevealModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060a0f]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0f1520] border border-[#1a2535] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1a2535]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-slate-400">{experimentType}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#142030] rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}

            {/* Verification Section */}
            {showVerification && verificationData && (
              <div className="mt-8 p-4 bg-[#0a1018] rounded-xl border border-[#1a2535]">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-cyan-400">Cryptographic Verification</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {verificationData.commitmentId && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-xs">Commitment ID</p>
                        <p className="font-mono text-xs break-all text-slate-300">
                          {verificationData.commitmentId}
                        </p>
                      </div>
                    </div>
                  )}
                  {verificationData.nonce && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-xs">Nonce</p>
                        <p className="font-mono text-xs break-all text-slate-300">
                          {verificationData.nonce.substring(0, 32)}...
                        </p>
                      </div>
                    </div>
                  )}
                  {verificationData.ipfsCID && (
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-xs">IPFS CID</p>
                        <p className="font-mono text-xs break-all text-slate-300">
                          {verificationData.ipfsCID}
                        </p>
                      </div>
                    </div>
                  )}
                  {verificationData.timestamp && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-xs">Committed At</p>
                        <p className="text-xs text-slate-300">
                          {new Date(verificationData.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {onConfirm && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#1a2535]">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg border border-gray-600 hover:bg-[#142030] transition-colors"
                disabled={isLoading}
              >
                Close
              </button>
              <button
                onClick={onConfirm}
                disabled={confirmDisabled || isLoading}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-violet-600 hover:to-fuchsia-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Utility Components for RevealModal content
 */

interface ResultCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'neutral';
  className?: string;
}

export function ResultCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'neutral',
  className = ''
}: ResultCardProps) {
  const variants = {
    success: 'border-green-500/30 bg-green-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
    neutral: 'border-gray-600 bg-[#0a1018]'
  };

  const iconColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    neutral: 'text-slate-400'
  };

  return (
    <div className={`p-4 rounded-xl border ${variants[variant]} ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <div className={iconColors[variant]}>{icon}</div>}
        <div className="flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface RoundResultProps {
  round: number;
  prediction: string | number;
  actual: string | number;
  isCorrect?: boolean;
  additionalInfo?: ReactNode;
}

export function RoundResult({ round, prediction, actual, isCorrect, additionalInfo }: RoundResultProps) {
  return (
    <div className={`p-4 rounded-lg border ${isCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-gray-600 bg-[#0a1018]'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCorrect !== undefined && (
            isCorrect ?
              <CheckCircle className="w-5 h-5 text-green-400" /> :
              <AlertCircle className="w-5 h-5 text-slate-400" />
          )}
          <div>
            <p className="text-sm text-slate-400">Round {round}</p>
            <div className="flex items-center gap-4 mt-1">
              <div>
                <span className="text-xs text-slate-500">Your prediction: </span>
                <span className="font-semibold">{prediction}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500">Actual: </span>
                <span className="font-semibold">{actual}</span>
              </div>
            </div>
          </div>
        </div>
        {isCorrect !== undefined && (
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-[#1a2535] text-slate-400'}`}>
            {isCorrect ? 'Hit' : 'Miss'}
          </div>
        )}
      </div>
      {additionalInfo && <div className="mt-3 pt-3 border-t border-[#1a2535]">{additionalInfo}</div>}
    </div>
  );
}

interface StatsSummaryProps {
  stats: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }>;
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="p-4 rounded-lg bg-[#0a1018] border border-[#1a2535]">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-2xl font-bold">{stat.value}</p>
            {stat.trend && stat.trendValue && (
              <div className={`flex items-center gap-1 text-xs pb-1 ${
                stat.trend === 'up' ? 'text-green-400' :
                stat.trend === 'down' ? 'text-red-400' :
                'text-slate-400'
              }`}>
                <TrendingUp className={`w-3 h-3 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                {stat.trendValue}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
