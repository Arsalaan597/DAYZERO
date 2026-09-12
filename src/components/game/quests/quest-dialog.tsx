'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Create / Edit Quest Dialog Component
// ---------------------------------------------------------------------------

import { useState, type FormEvent, useEffect } from 'react';
import { ATTRIBUTES, ATTRIBUTE_REALM_MAP, DIFFICULTIES, REALMS } from '@/config/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createQuestAction, updateQuestAction } from '@/lib/actions/quests';
import type { Attribute, Difficulty, Quest } from '@/types/game';

interface QuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questToEdit?: Quest | null;
  onSuccess?: () => void;
}

interface QuestFormProps {
  questToEdit?: Quest | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function QuestForm({ questToEdit, onClose, onSuccess }: QuestFormProps) {
  const isEditing = Boolean(questToEdit);

  const [title, setTitle] = useState(questToEdit ? questToEdit.title : '');
  const [description, setDescription] = useState(
    questToEdit ? questToEdit.description ?? '' : '',
  );
  const [attribute, setAttribute] = useState<Attribute>(
    questToEdit ? questToEdit.attribute : 'intellect',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    questToEdit ? questToEdit.difficulty : 'medium',
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEditing && questToEdit) {
        const res = await updateQuestAction({
          id: questToEdit.id,
          title,
          description,
          attribute,
          difficulty,
        });

        if (!res.success) {
          setError(res.error ?? 'Failed to update quest.');
          setLoading(false);
          return;
        }
      } else {
        const res = await createQuestAction({
          title,
          description,
          attribute,
          difficulty,
        });

        if (!res.success) {
          setError(res.error ?? 'Failed to inscribe quest.');
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  const selectedRewards = DIFFICULTIES[difficulty];

  return (
    <div
      className="w-full max-w-lg border border-ash/20 bg-obsidian p-6 shadow-2xl sm:p-8"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-ash/10 pb-4">
        <div>
          <span className="text-[10px] tracking-[0.25em] text-ash uppercase">
            {isEditing ? 'Modify Inscription' : 'New Inscription'}
          </span>
          <h2
            id="dialog-title"
            className="mt-0.5 font-display text-xl tracking-wider text-parchment uppercase"
          >
            {isEditing ? 'Edit Quest' : 'Inscribe Quest'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ash/60 transition-colors hover:text-parchment"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Title */}
        <Input
          label="Quest Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 30 pages of ancient history"
          required
          maxLength={120}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quest-desc" className="text-sm tracking-wide text-ash">
            Description <span className="text-xs text-ash/50">(Optional)</span>
          </label>
          <textarea
            id="quest-desc"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Record details or vows for this journey..."
            rows={3}
            maxLength={500}
            className="w-full resize-none border border-ash/20 bg-stone px-4 py-2.5 text-sm text-parchment transition-colors placeholder:text-ash/40 focus:border-ember focus:outline-none"
          />
        </div>

        {/* Attribute Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm tracking-wide text-ash">
            Attribute & Realm Resonance
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ATTRIBUTES.map((attr) => {
              const realmKey = ATTRIBUTE_REALM_MAP[attr];
              const realm = REALMS[realmKey];
              const isSelected = attribute === attr;

              return (
                <button
                  key={attr}
                  type="button"
                  onClick={() => setAttribute(attr)}
                  className={[
                    'border p-2.5 text-left transition-colors',
                    isSelected
                      ? 'border-ember bg-stone text-parchment'
                      : 'border-ash/15 bg-stone/40 text-ash hover:border-ash/30 hover:text-parchment',
                  ].join(' ')}
                >
                  <p className="font-display text-xs tracking-wider uppercase">
                    {attr}
                  </p>
                  <p className="text-[10px] tracking-wider text-ash/60 uppercase">
                    {realm.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Tier */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm tracking-wide text-ash">Difficulty Tier</label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map((diff) => {
              const cfg = DIFFICULTIES[diff];
              const isSelected = difficulty === diff;

              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={[
                    'border p-2.5 text-center transition-colors',
                    isSelected
                      ? 'border-ember bg-stone text-parchment'
                      : 'border-ash/15 bg-stone/40 text-ash hover:border-ash/30 hover:text-parchment',
                  ].join(' ')}
                >
                  <p className="font-display text-xs tracking-wider uppercase">
                    {cfg.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ember">
                    +{cfg.xp} XP / +{cfg.gold} G
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Canonical Rewards Notice */}
        <div className="border border-ash/10 bg-stone/20 p-3 text-xs text-ash/60">
          <span className="text-ember">◆</span> Canonical Yield:{' '}
          <span className="font-display text-ember">+{selectedRewards.xp} XP</span> ·{' '}
          <span className="font-display text-gold">+{selectedRewards.gold} Gold</span> ·{' '}
          <span className="text-parchment">
            +{difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20}{' '}
            {attribute}
          </span>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-ash/10 pt-4">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading
              ? isEditing
                ? 'Saving…'
                : 'Inscribing…'
              : isEditing
              ? 'Save Changes'
              : 'Inscribe Quest'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function QuestDialog({
  isOpen,
  onClose,
  questToEdit,
  onSuccess,
}: QuestDialogProps) {
  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={onClose}
    >
      <QuestForm
        key={questToEdit?.id ?? 'new-quest'}
        questToEdit={questToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
