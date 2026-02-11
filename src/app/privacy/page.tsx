'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-12">Last updated: February 9, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">1. Overview</h2>
            <p>
              Cognosis Institute (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use the Cognosis Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Wallet Information</h3>
            <p>
              When you connect your wallet, we collect your public wallet address for identification and authentication. We never access or store your private keys, seed phrases, or wallet passwords.
            </p>

            <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Experiment Data</h3>
            <p>
              We collect your experiment predictions, responses, and session metadata. Predictions are encrypted client-side before transmission. Scientific analysis uses anonymized, de-identified data only.
            </p>

            <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">Usage Data</h3>
            <p>
              We may collect basic usage analytics such as page views, experiment completion rates, and session duration. This data is used to improve the Platform experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate your identity via wallet signature verification</li>
              <li>Process and score experiment results</li>
              <li>Distribute PSY token rewards based on participation and accuracy</li>
              <li>Conduct anonymized scientific research and statistical analysis</li>
              <li>Improve Platform features and user experience</li>
              <li>Prevent fraud and enforce Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">4. Blockchain &amp; On-Chain Data</h2>
            <p>
              Certain data is committed to the Cardano blockchain, including commitment hashes, transaction metadata, and experiment timestamps. Blockchain data is:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Publicly viewable by anyone</li>
              <li>Immutable and cannot be deleted</li>
              <li>Pseudonymous (linked to wallet addresses, not personal identity)</li>
            </ul>
            <p className="mt-3">
              Your actual predictions remain encrypted and are only revealed when you choose to do so.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">5. IPFS Storage</h2>
            <p>
              Encrypted experiment data may be stored on IPFS (InterPlanetary File System) via Pinata. IPFS content is distributed and persistent. Data stored on IPFS is encrypted and can only be decrypted by authorized parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">6. AI Processing</h2>
            <p>
              Experiment responses are processed by AI models for scoring and analysis. AI scoring is conducted in a blinded manner - user identity and experiment history are stripped before processing. AI model versions are logged for reproducibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">7. Data Sharing</h2>
            <p>We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Blockchain networks (on-chain commitment data)</li>
              <li>IPFS network (encrypted experiment data)</li>
              <li>AI service providers (anonymized data for scoring)</li>
              <li>Research collaborators (aggregated, anonymized statistics)</li>
              <li>Law enforcement (only if legally required)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">8. Data Security</h2>
            <p>
              We use industry-standard security measures including AES-256-GCM encryption for predictions, challenge-response authentication (CIP-8), JWT tokens with HTTP-only cookies, and rate limiting on all API endpoints.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">9. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Disconnect your wallet at any time</li>
              <li>Request deletion of off-chain data</li>
              <li>Export your experiment history</li>
              <li>Opt out of non-essential analytics</li>
            </ul>
            <p className="mt-3">
              Note: On-chain and IPFS data cannot be deleted due to the immutable nature of these technologies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">10. Cookies &amp; Local Storage</h2>
            <p>
              We use browser localStorage to persist your wallet connection and authentication tokens. We do not use third-party tracking cookies. Session data is stored locally on your device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes through the Platform interface. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#e0e8f0] mb-3">12. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:privacy@cognosispredict.com" className="text-cyan-400 hover:text-cyan-300">
                privacy@cognosispredict.com
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
