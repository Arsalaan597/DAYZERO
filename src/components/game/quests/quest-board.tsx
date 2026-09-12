'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Board Component
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuestCard } from '@/components/game/quests/quest-card';
import { QuestDialog } from '@/components/game/quests/quest-dialog';
import { RewardReveal } from '@/components/game/quests/reward-reveal';
import { WayfarerStats } from '@/components/game/wayfarer-stats';
import { completeQuestAction } from '@/lib/actions/quests';
import type { AttributesRow, ProfileRow, RealmProgressRow } from '@/types/database';
import type { Quest, QuestCompletionResult } from '@/types/game';

interface QuestBoardProps {
  initialQuests: Quest[];
  profile: ProfileRow;
  attributes?: AttributesRow | null;
  realmProgress?: RealmProgressRow | null;
}

export function QuestBoard({
  initialQuests,
  profile,
  attributes,
  realmProgress,
}: QuestBoardProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [questToEdit, setQuestToEdit] = useState<Quest | null>(null);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<QuestCompletionResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const activeQuests = initialQuests.filter((q) => !q.completed);
  const completedQuests = initialQuests.filter((q) => q.completed);

  function handleOpenCreate() {
    setQuestToEdit(null);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(quest: Quest) {
    setQuestToEdit(quest);
    setIsDialogOpen(true);
  }

  async function handleCompleteQuest(questId: string) {
    setErrorNotice(null);
    setCompletingId(questId);

    try {
      const res = await completeQuestAction(questId);
      if (!res.success || !res.data) {
        setErrorNotice(res.error ?? 'Failed to complete quest.');
        setCompletingId(null);
        return;
      }

      setCompletingId(null);
      setCompletionResult(res.data);
    } catch {
      setErrorNotice('A network failure occurred. Please try again.');
      setCompletingId(null);
    }
  }

  const currentQuests = activeTab === 'active' ? activeQuests : completedQuests;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Wayfarer Summary Bar */}
      <section className="mb-10">
        <WayfarerStats
          profile={profile}
          attributes={attributes}
          realmProgress={realmProgress}
        />
      </section>

      {/* Board Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ash/15 pb-5">
        <div>
          <span className="text-xs tracking-[0.25em] text-ash uppercase">
            Wayfarer&apos;s Chronicle
          </span>
          <h1 className="mt-1 font-display text-2xl tracking-widest text-parchment uppercase sm:text-3xl">
            Quests of the Awakening
          </h1>
        </div>

        <Button variant="primary" onClick={handleOpenCreate}>
          + Inscribe Quest
        </Button>
      </div>

      {/* Error Alert Banner */}
      {errorNotice && (
        <div
          className="mb-6 flex items-center justify-between border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <span>{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-xs text-danger hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex items-center gap-4 border-b border-ash/10">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={[
            'pb-3 font-display text-xs tracking-widest uppercase transition-colors',
            activeTab === 'active'
              ? 'border-b-2 border-ember text-ember'
              : 'text-ash/60 hover:text-parchment',
          ].join(' ')}
        >
          Active Vows ({activeQuests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={[
            'pb-3 font-display text-xs tracking-widest uppercase transition-colors',
            activeTab === 'completed'
              ? 'border-b-2 border-ember text-ember'
              : 'text-ash/60 hover:text-parchment',
          ].join(' ')}
        >
          Fulfilled ({completedQuests.length})
        </button>
      </div>

      {/* Quest Cards Grid */}
      {currentQuests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {currentQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onComplete={handleCompleteQuest}
              onEdit={handleOpenEdit}
              isCompleting={completingId === quest.id}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="border border-dashed border-ash/15 bg-obsidian/20 px-6 py-16 text-center">
          <p className="font-display text-base tracking-widest text-ash/60 uppercase">
            {activeTab === 'active' ? 'No Active Inscriptions' : 'No Fulfilled Quests'}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ash/40">
            {activeTab === 'active'
              ? 'The stone lies uncarved. Inscribe a real-world task to awaken this dormant realm.'
              : 'No vows have been fulfilled yet. Complete active quests to record history here.'}
          </p>
          {activeTab === 'active' && (
            <div className="mt-6">
              <Button variant="secondary" onClick={handleOpenCreate}>
                {initialQuests.length === 0
                  ? 'Inscribe Your First Quest'
                  : 'Inscribe a New Quest'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      <QuestDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        questToEdit={questToEdit}
      />

      {/* Reward Reveal Modal (shown after complete_quest) */}
      <RewardReveal
        result={completionResult}
        onDismiss={() => setCompletionResult(null)}
      />
    </div>
  );
}
