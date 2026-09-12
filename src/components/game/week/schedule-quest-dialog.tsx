'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Schedule / Move Quest Dialog Component
// ---------------------------------------------------------------------------

import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rescheduleQuestAction, setMainQuestAction } from '@/lib/actions/quests';
import type { Quest } from '@/types/game';

interface ScheduleQuestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  defaultDate?: string;
  onSuccess?: () => void;
}

interface ScheduleQuestFormProps {
  quest: Quest;
  defaultDate?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function ScheduleQuestForm({
  quest,
  defaultDate,
  onClose,
  onSuccess,
}: ScheduleQuestFormProps) {
  const [scheduledDate, setScheduledDate] = useState(
    quest.scheduledDate || defaultDate || new Date().toISOString().slice(0, 10)
  );
  const [scheduledStartTime, setScheduledStartTime] = useState(
    quest.scheduledStartTime || ''
  );
  const [isMainQuest, setIsMainQuest] = useState(quest.isMainQuest || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Reschedule quest
      const res = await rescheduleQuestAction(
        quest.id,
        scheduledDate || null,
        scheduledStartTime || null
      );

      if (!res.success) {
        setError(res.error || 'Failed to schedule quest.');
        setLoading(false);
        return;
      }

      // 2. Set main quest designation if changed
      if (isMainQuest !== quest.isMainQuest) {
        const mainRes = await setMainQuestAction(quest.id, isMainQuest);
        if (!mainRes.success) {
          setError(mainRes.error || 'Failed to designate Main Quest. (Only 1 Main Quest allowed per date).');
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setLoading(false);
    }
  }

  async function handleUnschedule() {
    setLoading(true);
    try {
      const res = await rescheduleQuestAction(quest.id, null, null);
      if (!res.success) {
        setError(res.error || 'Failed to unschedule.');
        setLoading(false);
        return;
      }
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch {
      setError('Failed to unschedule.');
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full max-w-md border border-ash/20 bg-obsidian p-6 shadow-2xl sm:p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-5 flex items-center justify-between border-b border-ash/10 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.25em] text-ash uppercase">
            Planning Chamber
          </p>
          <h2
            id="schedule-quest-title"
            className="mt-0.5 font-display text-lg tracking-wider text-parchment uppercase"
          >
            Schedule Quest
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ash/60 hover:text-parchment"
        >
          ✕
        </button>
      </div>

      <p className="font-display text-sm text-ember mb-4 tracking-wide">
        {quest.title}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Scheduled Date"
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
        />

        <Input
          label="Start Time (Optional)"
          type="time"
          value={scheduledStartTime}
          onChange={(e) => setScheduledStartTime(e.target.value)}
        />

        {/* Main Quest designation toggle */}
        <div className="border border-ash/15 bg-stone/30 p-3.5 flex items-start gap-3">
          <input
            type="checkbox"
            id="main-quest-toggle"
            checked={isMainQuest}
            onChange={(e) => setIsMainQuest(e.target.checked)}
            className="mt-1 h-4 w-4 accent-ember"
          />
          <label htmlFor="main-quest-toggle" className="text-xs cursor-pointer select-none">
            <span className="font-display tracking-wider text-parchment uppercase block">
              Designate as Daily Main Quest
            </span>
            <span className="text-[11px] text-ash/80 mt-0.5 block leading-relaxed">
              Awards <strong className="text-ember">+20 XP and +10 Gold bonus</strong>. Maximum of one Main Quest per day.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-ash/10 pt-4">
          {quest.scheduledDate ? (
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-ash/70 hover:text-danger"
              onClick={handleUnschedule}
              disabled={loading}
            >
              Unschedule
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : 'Confirm Schedule'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function ScheduleQuestDialog({
  isOpen,
  onClose,
  quest,
  defaultDate,
  onSuccess,
}: ScheduleQuestDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !quest) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-quest-title"
      onClick={onClose}
    >
      <ScheduleQuestForm
        key={`${quest.id}-${defaultDate}`}
        quest={quest}
        defaultDate={defaultDate}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
