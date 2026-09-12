'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Routine Creation & Edit Dialog Component
// ---------------------------------------------------------------------------

import { useState, type FormEvent, useEffect } from 'react';
import { ATTRIBUTES, ATTRIBUTE_REALM_MAP, REALMS } from '@/config/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createRoutineAction, updateRoutineAction } from '@/lib/actions/routines';
import type { Attribute, Effort, Challenge, Routine } from '@/types/game';

interface RoutineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  routineToEdit?: Routine | null;
  onSuccess?: () => void;
}

interface RoutineFormProps {
  routineToEdit?: Routine | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

function RoutineForm({
  routineToEdit,
  onClose,
  onSuccess,
}: RoutineFormProps) {
  const isEditing = Boolean(routineToEdit);

  const [title, setTitle] = useState(routineToEdit?.title ?? '');
  const [description, setDescription] = useState(routineToEdit?.description ?? '');
  const [attribute, setAttribute] = useState<Attribute>(
    routineToEdit?.attribute ?? 'intellect'
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    routineToEdit?.daysOfWeek ?? [1, 2, 3, 4, 5] // Default Mon-Fri
  );
  const [startTime, setStartTime] = useState(routineToEdit?.startTime ?? '08:00');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(
    routineToEdit?.estimatedMinutes ?? 30
  );
  const [effort, setEffort] = useState<Effort>(routineToEdit?.effort ?? 'standard');
  const [challenge, setChallenge] = useState<Challenge>(
    routineToEdit?.challenge ?? 'routine'
  );
  const [startsOn, setStartsOn] = useState(
    routineToEdit?.startsOn ?? new Date().toISOString().slice(0, 10)
  );
  const [endsOn, setEndsOn] = useState(routineToEdit?.endsOn ?? '');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Routine title cannot be empty.');
      return;
    }

    if (daysOfWeek.length === 0) {
      setError('Please select at least one recurrence day.');
      return;
    }

    const trimmedEndsOn = endsOn ? endsOn.trim() : '';
    if (trimmedEndsOn && startsOn && trimmedEndsOn < startsOn) {
      setError('End Date cannot be earlier than Effective Start Date.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && routineToEdit) {
        const res = await updateRoutineAction({
          id: routineToEdit.id,
          title: trimmedTitle,
          description: description ? description.trim() : null,
          attribute,
          daysOfWeek,
          startTime: startTime || null,
          estimatedMinutes: Number(estimatedMinutes) || null,
          effort,
          challenge,
          startsOn,
          endsOn: trimmedEndsOn || null,
        });

        if (!res.success) {
          setError(res.error || 'Failed to update routine.');
          setLoading(false);
          return;
        }
      } else {
        const res = await createRoutineAction({
          title: trimmedTitle,
          description: description ? description.trim() : null,
          attribute,
          daysOfWeek,
          startTime: startTime || null,
          estimatedMinutes: Number(estimatedMinutes) || null,
          effort,
          challenge,
          startsOn,
          endsOn: trimmedEndsOn || null,
        });

        if (!res.success) {
          setError(res.error || 'Failed to establish routine.');
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

  return (
    <div
      className="flex flex-col w-full max-w-lg max-h-[90dvh] border border-ash/20 bg-obsidian shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-ash/10 p-5 sm:p-6 pb-4 bg-obsidian">
        <div>
          <span className="text-[10px] tracking-[0.25em] text-ash uppercase">
            {isEditing ? 'Modify Discipline' : 'New Habit Discipline'}
          </span>
          <h2
            id="routine-dialog-title"
            className="mt-0.5 font-display text-xl tracking-wider text-parchment uppercase"
          >
            {isEditing ? 'Edit Routine' : 'Inscribe Routine'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ash/60 transition-colors hover:text-parchment p-1"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>

      {/* Form with reliably scrollable content & sticky actions */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Title */}
          <Input
            label="Routine Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning Algorithm Review"
            required
            maxLength={120}
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routine-desc" className="text-sm tracking-wide text-ash">
              Description <span className="text-xs text-ash/50">(Optional)</span>
            </label>
            <textarea
              id="routine-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Habit guidelines and intentions..."
              rows={2}
              maxLength={500}
              className="w-full resize-none border border-ash/20 bg-stone px-4 py-2 text-sm text-parchment transition-colors placeholder:text-ash/40 focus:border-ember focus:outline-none"
            />
          </div>

          {/* Attribute Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm tracking-wide text-ash">
              Attribute Resonance
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ATTRIBUTES.map((attr) => {
                const realmKey = ATTRIBUTE_REALM_MAP[attr];
                const realm = REALMS[realmKey];
                const isSelected = attribute === attr;

                return (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => setAttribute(attr)}
                    className={`border p-2 text-left transition-colors ${
                      isSelected
                        ? 'border-ember bg-stone text-parchment'
                        : 'border-ash/15 bg-stone/40 text-ash hover:border-ash/30 hover:text-parchment'
                    }`}
                  >
                    <p className="font-display text-xs tracking-wider uppercase">
                      {attr}
                    </p>
                    <p className="text-[9px] text-ash/60 uppercase">
                      {realm.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurrence Days */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm tracking-wide text-ash">
              Weekly Recurrence Days
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => {
                const active = daysOfWeek.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`border py-2 text-center text-xs font-display tracking-wider transition-colors uppercase ${
                      active
                        ? 'border-ember bg-ember/20 text-parchment font-semibold'
                        : 'border-ash/15 bg-stone/30 text-ash/60 hover:text-parchment'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Est. Minutes"
              type="number"
              min={5}
              max={360}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            />
          </div>

          {/* Effort Classification */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm tracking-wide text-ash">
              Effort Tier (Depth)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'light', label: 'Light', desc: '5–20 min' },
                  { id: 'standard', label: 'Standard', desc: '20–60 min' },
                  { id: 'deep', label: 'Deep', desc: '60+ min' },
                ] as const
              ).map((tier) => {
                const isSelected = effort === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setEffort(tier.id)}
                    className={`border p-2 text-center transition-colors ${
                      isSelected
                        ? 'border-ember bg-stone text-parchment'
                        : 'border-ash/15 bg-stone/40 text-ash hover:border-ash/30 hover:text-parchment'
                    }`}
                  >
                    <p className="font-display text-xs tracking-wider uppercase">
                      {tier.label}
                    </p>
                    <p className="text-[10px] text-ash/60">{tier.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Challenge Bonus */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm tracking-wide text-ash">
              Challenge Bonus Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'routine', label: 'Routine', bonus: '+0' },
                  { id: 'challenging', label: 'Challenging', bonus: '+10 XP / +5 G' },
                  { id: 'hard', label: 'Hard', bonus: '+25 XP / +10 G' },
                ] as const
              ).map((chal) => {
                const isSelected = challenge === chal.id;
                return (
                  <button
                    key={chal.id}
                    type="button"
                    onClick={() => setChallenge(chal.id)}
                    className={`border p-2 text-center transition-colors ${
                      isSelected
                        ? 'border-ember bg-stone text-parchment'
                        : 'border-ash/15 bg-stone/40 text-ash hover:border-ash/30 hover:text-parchment'
                    }`}
                  >
                    <p className="font-display text-xs tracking-wider uppercase">
                      {chal.label}
                    </p>
                    <p className="text-[10px] text-ember">{chal.bonus}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates: Start Date & Optional End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Effective Start Date"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              required
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </div>

          {/* Habit Anti-farming note */}
          <div className="border border-ash/10 bg-stone/20 p-3 text-xs text-ash/70 leading-relaxed">
            <span className="text-ember font-semibold">◆ Habit Economics:</span>{' '}
            Routines grant <strong>100% attribute resonance</strong> to foster character habits, with a balanced <strong>75% XP and Gold yield</strong> to maintain long-term game balance.
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-ash/10 p-4 sm:p-5 bg-obsidian">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading
              ? isEditing
                ? 'Saving…'
                : 'Inscribing…'
              : isEditing
              ? 'Save Routine'
              : 'Establish Routine'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RoutineDialog({
  isOpen,
  onClose,
  routineToEdit,
  onSuccess,
}: RoutineDialogProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 p-3 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="routine-dialog-title"
      onClick={onClose}
    >
      <RoutineForm
        key={routineToEdit?.id ?? 'new-routine'}
        routineToEdit={routineToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
