'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Quest Card Component
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { ATTRIBUTE_REALM_MAP, DIFFICULTIES, REALMS } from '@/config/game';
import { Button } from '@/components/ui/button';
import { deleteQuestAction } from '@/lib/actions/quests';
import { formatDeterministicDate } from '@/lib/game/dates';
import type { Quest } from '@/types/game';

interface QuestCardProps {
  quest: Quest;
  onComplete: (questId: string) => Promise<void>;
  onEdit: (quest: Quest) => void;
  isCompleting?: boolean;
}

export function QuestCard({
  quest,
  onComplete,
  onEdit,
  isCompleting = false,
}: QuestCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const realmKey = ATTRIBUTE_REALM_MAP[quest.attribute];
  const realm = REALMS[realmKey];
  const difficultyConfig = DIFFICULTIES[quest.difficulty];

  async function handleDelete() {
    setIsDeleting(true);
    await deleteQuestAction(quest.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  }

  const isCompleted = quest.completed;

  return (
    <article
      className={[
        'border p-5 transition-all duration-300',
        isCompleting
          ? 'scale-[0.98] opacity-40 border-ember/30 bg-obsidian/40'
          : isCompleted
          ? 'border-ash/10 bg-obsidian/30 opacity-75'
          : 'border-ash/20 bg-obsidian/60 hover:border-ash/40',
      ].join(' ')}
      aria-label={`Quest: ${quest.title}`}
    >
      {/* Top badges row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ash/10 pb-3">
        {/* Attribute & Realm Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-display tracking-widest text-parchment uppercase">
            {quest.attribute}
          </span>
          <span className="text-ash/40">◆</span>
          <span className="text-ash/70 tracking-wider uppercase">
            {realm.name}
          </span>
        </div>

        {/* Difficulty & Rewards badge */}
        <div className="flex items-center gap-3">
          <span className="border border-ash/20 bg-stone px-2 py-0.5 font-display text-[10px] tracking-widest text-ash uppercase">
            {difficultyConfig.label}
          </span>
          <div className="text-right text-xs font-display">
            <span className="text-ember">+{quest.xpReward} XP</span>
            <span className="mx-1.5 text-ash/30">·</span>
            <span className="text-gold">+{quest.goldReward} G</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-4">
        <h3
          className={[
            'font-display text-base tracking-wide text-parchment',
            isCompleted ? 'line-through text-ash/80' : '',
          ].join(' ')}
        >
          {quest.title}
        </h3>

        {quest.description && (
          <p className="mt-2 text-xs leading-relaxed text-ash/90">
            {quest.description}
          </p>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ash/10 pt-3">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-xs text-ash/80">
            <span className="text-ember">✓</span>
            <span>
              Fulfilled {formatDeterministicDate(quest.completedAt, false)}
            </span>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={() => onComplete(quest.id)}
            disabled={isCompleting}
            aria-label={`Complete quest: ${quest.title}`}
            className="text-xs px-4 py-1.5"
          >
            {isCompleting ? 'Fulfilling…' : 'Complete Quest'}
          </Button>
        )}

        {/* Secondary Edit/Delete Actions (Only for non-completed or delete allowed) */}
        {!isCompleted && !showDeleteConfirm && (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onEdit(quest)}
              disabled={isCompleting}
              className="text-ash/80 tracking-wider uppercase transition-colors hover:text-parchment focus-visible:outline-2 focus-visible:outline-ember"
            >
              Edit
            </button>
            <span className="text-ash/30">|</span>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isCompleting}
              className="text-ash/80 tracking-wider uppercase transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
            >
              Abandon
            </button>
          </div>
        )}

        {/* Delete Confirmation prompt */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ash/80">Abandon vow?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="font-display tracking-wider text-danger hover:underline"
            >
              {isDeleting ? 'Erasing…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="text-ash/90 hover:text-parchment"
            >
              No
            </button>
          </div>
        )}

        {/* Completed quests can be deleted */}
        {isCompleted && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[11px] text-ash/70 tracking-wider uppercase transition-colors hover:text-danger"
          >
            Remove Inscription
          </button>
        )}
      </div>
    </article>
  );
}
