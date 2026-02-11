'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-12">Last updated: February 9, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Cognosis Institute platform (&quot;Platform&quot;), including connecting a Cardano wallet, you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">2. Description of Service</h2>
            <p>
              Cognosis Institute provides a privacy-preserving platform for conducting verified psi and parapsychology experiments with blockchain integrity verification and AI-powered analysis. The Platform includes remote viewing experiments, prediction scoring, PSY token rewards, and related services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">3. Wallet Connection &amp; Authentication</h2>
            <p>
              Access to the Platform requires connecting a compatible Cardano wallet (e.g., Eternl, Lace, Vespr, NuFi, Typhon, OKX Wallet, Begin Wallet). By connecting your wallet, you authorize the Platform to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Read your wallet address for identification purposes</li>
              <li>Request message signatures for authentication (CIP-8)</li>
              <li>Submit transactions you explicitly approve</li>
            </ul>
            <p className="mt-3">
              You are solely responsible for the security of your wallet and private keys. Cognosis Institute never has access to your private keys.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">4. PSY Tokens &amp; Rewards</h2>
            <p>
              PSY tokens are utility tokens on the Cardano blockchain earned through platform participation. PSY tokens are not securities, investments, or financial instruments. Reward amounts are determined by AI-scored accuracy and participation metrics. Cognosis Institute reserves the right to modify the reward structure at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">5. Experiment Participation</h2>
            <p>
              Experiments are conducted for research purposes. By participating, you consent to your anonymized experiment data being used for statistical analysis and scientific research. No personally identifiable information is shared with researchers. All predictions are cryptographically committed to the blockchain before reveal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">6. Blockchain Data</h2>
            <p>
              Data committed to the Cardano blockchain is immutable and publicly verifiable. This includes commitment hashes, transaction metadata, and experiment timestamps. You acknowledge that blockchain data cannot be deleted or modified once submitted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">7. Testnet Disclaimer</h2>
            <p>
              The Platform currently operates on the Cardano Preprod Testnet. Testnet tokens (tADA) have no monetary value. Features and data on the testnet may be reset or modified without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">8. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Manipulate or attempt to game experiment results</li>
              <li>Use automated tools or bots to interact with the Platform</li>
              <li>Interfere with the Platform&apos;s infrastructure or security</li>
              <li>Attempt to reverse-engineer commitment hashes or encryption</li>
              <li>Misrepresent your identity or wallet ownership</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">9. Limitation of Liability</h2>
            <p>
              The Platform is provided &quot;as is&quot; without warranties of any kind. Cognosis Institute is not liable for any losses arising from wallet connections, blockchain transactions, smart contract interactions, or token value fluctuations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms. We will notify users of material changes through the Platform interface.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">11. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href="mailto:legal@cognosispredict.com" className="text-cyan-400 hover:text-cyan-300">
                legal@cognosispredict.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-12 border-t border-[#1a2535] text-center text-slate-500">
        <p>
          <Link href="/privacy" className="hover:text-cyan-400">Privacy Policy</Link>
          {' '}&bull;{' '}
          <Link href="/terms" className="hover:text-cyan-400">Terms of Service</Link>
        </p>
      </footer>
    </div>
  );
}
