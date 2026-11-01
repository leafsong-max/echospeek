/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PracticeView } from './components/PracticeView';
import { SentenceLibrary } from './components/SentenceLibrary';
import { WeaknessNotebook } from './components/WeaknessNotebook';
import { StatsView } from './components/StatsView';
import { SettingsModal } from './components/SettingsModal';
import { CustomSentenceModal } from './components/CustomSentenceModal';
import { PasscodeLockModal } from './components/PasscodeLockModal';
import { Sentence, Settings, UserStats } from './types';
import {
  getAllSentences,
  getStoredPasscode,
  loadDailyRecords,
  loadSettings,
  loadStats,
} from './utils/storage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'practice' | 'library' | 'weakness' | 'stats'>('practice');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [stats, setStats] = useState<UserStats>(loadStats());
  const [settings, setSettings] = useState<Settings>(loadSettings());

  // Passcode Lock State
  const [isLocked, setIsLocked] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Check auth requirement on load
  useEffect(() => {
    const checkAuthRequirement = async () => {
      try {
        const storedCode = getStoredPasscode();
        const res = await fetch('/api/auth-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: storedCode }),
        });
        const data = await res.json();
        if (data.requiresPasscode && !data.success) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      } catch (e) {
        // if offline or local without code, don't block
      }
    };
    checkAuthRequirement();
  }, []);

  // Initialize sentences
  useEffect(() => {
    refreshSentences();
  }, []);

  const refreshSentences = () => {
    const all = getAllSentences();
    setSentences(all);
    if (!currentSentence && all.length > 0) {
      setCurrentSentence(all[0]);
    } else if (currentSentence) {
      // update bookmark state on current
      const found = all.find((s) => s.id === currentSentence.id);
      if (found) setCurrentSentence(found);
    }
  };

  const handleStatsUpdate = (newStats: UserStats) => {
    setStats(newStats);
  };

  const handleSelectSentence = (sentence: Sentence) => {
    setCurrentSentence(sentence);
    setCurrentTab('practice');
  };

  // Compute today's practice count
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  })();
  const dailyRecords = loadDailyRecords();
  const todayCount = dailyRecords[todayStr]?.sentenceCount || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        stats={stats}
        todayCount={todayCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'practice' && currentSentence && (
          <PracticeView
            sentence={currentSentence}
            allSentences={sentences}
            onSelectSentence={setCurrentSentence}
            settings={settings}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
          />
        )}

        {currentTab === 'library' && (
          <SentenceLibrary
            sentences={sentences}
            onSelectSentence={handleSelectSentence}
            onRefreshSentences={refreshSentences}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
            settings={settings}
            onOpenCustomModal={() => setIsCustomModalOpen(true)}
          />
        )}

        {currentTab === 'weakness' && (
          <WeaknessNotebook
            sentences={sentences}
            onSelectSentence={handleSelectSentence}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
            settings={settings}
            onGoToPractice={() => setCurrentTab('practice')}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView
            stats={stats}
            sentences={sentences}
            onSelectSentence={handleSelectSentence}
            onGoToPractice={() => setCurrentTab('practice')}
            onRefresh={() => {
              setStats(loadStats());
              refreshSentences();
            }}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        stats={stats}
        onUpdateStats={setStats}
      />

      {/* Custom Sentence Modal */}
      <CustomSentenceModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAdded={(newSentence) => {
          refreshSentences();
          setCurrentSentence(newSentence);
          setCurrentTab('practice');
        }}
      />

      {/* Secret Passcode Lock Screen (for personal & friend use) */}
      <PasscodeLockModal
        isOpen={isLocked}
        onUnlocked={() => setIsLocked(false)}
      />
    </div>
  );
}
