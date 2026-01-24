'use client';

import Header from '@/components/layout/Header';
import { Settings as SettingsIcon, Bell, Shield, Palette, Moon, Sun, Globe } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    experiments: true,
    achievements: true,
    tokens: false,
    reminders: true
  });

  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-slate-400" />
              Settings
            </h1>
            <p className="text-slate-400">Manage your account preferences and notifications</p>
          </div>

          {/* Notifications */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Experiment Updates</div>
                  <div className="text-sm text-slate-400">Get notified about new experiments</div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, experiments: !notifications.experiments})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.experiments ? 'bg-cyan-600' : 'bg-[#1a2535]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.experiments ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Achievement Unlocks</div>
                  <div className="text-sm text-slate-400">Celebrate your accomplishments</div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, achievements: !notifications.achievements})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.achievements ? 'bg-cyan-600' : 'bg-[#1a2535]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.achievements ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Token Rewards</div>
                  <div className="text-sm text-slate-400">Get notified when you earn tokens</div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, tokens: !notifications.tokens})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.tokens ? 'bg-cyan-600' : 'bg-[#1a2535]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.tokens ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Practice Reminders</div>
                  <div className="text-sm text-slate-400">Daily reminders to maintain your streak</div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, reminders: !notifications.reminders})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.reminders ? 'bg-cyan-600' : 'bg-[#1a2535]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.reminders ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-cyan-400" />
              Appearance
            </h2>
            <div>
              <div className="text-white font-semibold mb-3">Theme</div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-[#1a2535] hover:border-gray-600'
                  }`}
                >
                  <Moon className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                  <div className="text-white font-semibold">Dark</div>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-[#1a2535] hover:border-gray-600'
                  }`}
                >
                  <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <div className="text-white font-semibold">Light</div>
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Privacy & Security
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#142030] rounded-lg">
                <div>
                  <div className="text-white font-semibold">Data Export</div>
                  <div className="text-sm text-slate-400">Download all your experiment data</div>
                </div>
                <button className="px-4 py-2 bg-[#1a2535] hover:bg-gray-600 text-white rounded-lg transition-colors">
                  Export
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#142030] rounded-lg">
                <div>
                  <div className="text-white font-semibold">Delete Account</div>
                  <div className="text-sm text-slate-400">Permanently delete your account and data</div>
                </div>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Language
            </h2>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-[#142030] text-white rounded-lg border border-[#1a2535] focus:border-cyan-500 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
