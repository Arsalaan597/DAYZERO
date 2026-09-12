'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Week Planning Board Component
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RoutineDialog } from '@/components/game/week/routine-dialog';
import { ScheduleQuestDialog } from '@/components/game/week/schedule-quest-dialog';
import { QuestDialog } from '@/components/game/quests/quest-dialog';
import { toggleRoutineAction, deleteRoutineAction } from '@/lib/actions/routines';
import type { Routine, Quest } from '@/types/game';
import type { RoutineInstanceRow } from '@/types/database';

interface DayPlan {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  instances: RoutineInstanceRow[];
  quests: Quest[];
  mainQuest: Quest | null;
}

interface WeekBoardProps {
  userTz: string;
  localToday: string;
  startDateStr: string;
  endDateStr: string;
  days: DayPlan[];
  routines: Routine[];
  unscheduledQuests: Quest[];
}

export function WeekBoard({
  userTz,
  localToday,
  days,
  routines,
  unscheduledQuests,
}: WeekBoardProps) {
  const router = useRouter();

  // Dialog states
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  const [questDialogOpen, setQuestDialogOpen] = useState(false);
  const [questToEdit, setQuestToEdit] = useState<Quest | null>(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [questToSchedule, setQuestToSchedule] = useState<Quest | null>(null);
  const [defaultScheduleDate, setDefaultScheduleDate] = useState<string>(localToday);

  // Mobile selected day (defaults to today or first day)
  const todayIndex = days.findIndex((d) => d.isToday);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Routines drawer toggle
  const [showRoutinesManager, setShowRoutinesManager] = useState(false);

  async function handleToggleRoutine(r: Routine) {
    await toggleRoutineAction(r.id, !r.isActive);
    router.refresh();
  }

  async function handleDeleteRoutine(r: Routine) {
    if (confirm(`Remove routine "${r.title}"? Historical completed records will remain preserved.`)) {
      await deleteRoutineAction(r.id);
      router.refresh();
    }
  }

  function handleOpenScheduleForDate(dateStr: string) {
    setDefaultScheduleDate(dateStr);
    if (unscheduledQuests.length > 0) {
      setQuestToSchedule(unscheduledQuests[0]);
      setScheduleDialogOpen(true);
    } else {
      // Create new quest for that date
      setQuestToEdit(null);
      setQuestDialogOpen(true);
    }
  }

  const selectedDay = days[selectedDayIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ash/15 pb-6">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-ember uppercase">
            Planning Chamber · {userTz}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl tracking-widest text-parchment uppercase">
            Seven-Day Cycle
          </h1>
          <p className="mt-0.5 text-xs tracking-wider text-ash/80">
            Shape your habits and designate primary directives for each sunrise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            className="text-xs py-2 px-3 tracking-wider uppercase"
            onClick={() => setShowRoutinesManager(!showRoutinesManager)}
          >
            {showRoutinesManager ? 'Hide Routines' : `Routines (${routines.length})`}
          </Button>

          <Button
            variant="secondary"
            className="text-xs py-2 px-3 tracking-wider uppercase"
            onClick={() => {
              setRoutineToEdit(null);
              setRoutineDialogOpen(true);
            }}
          >
            + Routine
          </Button>

          <Button
            variant="primary"
            className="text-xs py-2 px-4 tracking-wider uppercase"
            onClick={() => {
              setQuestToEdit(null);
              setQuestDialogOpen(true);
            }}
          >
            + New Quest
          </Button>
        </div>
      </div>

      {/* Routine Templates Manager Drawer */}
      {showRoutinesManager && (
        <div className="my-6 border border-ash/20 bg-obsidian/95 p-5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-ash/15 pb-3">
            <div>
              <h2 className="font-display text-sm tracking-widest text-parchment uppercase">
                Active Weekly Routines
              </h2>
              <p className="text-[11px] text-ash/70">
                Templates automatically project onto matching weekdays in the Today run.
              </p>
            </div>
            <Button
              variant="primary"
              className="text-xs py-1 px-3"
              onClick={() => {
                setRoutineToEdit(null);
                setRoutineDialogOpen(true);
              }}
            >
              + Create Routine
            </Button>
          </div>

          {routines.length === 0 ? (
            <p className="py-6 text-center text-xs text-ash/60">
              No routines defined yet. Create your first habit to awaken the week.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {routines.map((r) => {
                const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const daysStr = r.daysOfWeek.map((d) => dayLabels[d]).join(' · ');

                return (
                  <div
                    key={r.id}
                    className={`border p-3.5 transition-colors ${
                      r.isActive
                        ? 'border-ash/25 bg-stone/40'
                        : 'border-ash/10 bg-stone/15 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xs text-parchment tracking-wider uppercase">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-ember tracking-wider uppercase mt-0.5">
                          {r.attribute} · {r.effort}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleRoutine(r)}
                        className={`text-[9px] font-display uppercase tracking-widest px-2 py-0.5 border ${
                          r.isActive
                            ? 'border-gold/40 text-gold bg-gold/10'
                            : 'border-ash/20 text-ash/50 bg-stone/30'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-ash/70 border-t border-ash/10 pt-2">
                      <span>{r.startTime || 'Anytime'} · {daysStr}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRoutineToEdit(r);
                            setRoutineDialogOpen(true);
                          }}
                          className="text-ash/70 hover:text-parchment"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(r)}
                          className="text-ash/50 hover:text-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unscheduled Quests Queue if any */}
      {unscheduledQuests.length > 0 && (
        <div className="my-6 border border-ash/20 bg-stone/20 p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs tracking-[0.2em] text-ember uppercase">
              Unscheduled Vows ({unscheduledQuests.length})
            </span>
            <span className="text-[11px] text-ash/70">
              Click &quot;Schedule&quot; to assign a day.
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unscheduledQuests.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 border border-ash/20 bg-obsidian px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-display text-parchment tracking-wide">{q.title}</p>
                  <p className="text-[10px] text-ash/60 uppercase">{q.attribute} · {q.difficulty}</p>
                </div>
                <Button
                  variant="secondary"
                  className="text-[10px] py-1 px-2.5"
                  onClick={() => {
                    setQuestToSchedule(q);
                    setScheduleDialogOpen(true);
                  }}
                >
                  Schedule
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Horizontal Day Selector */}
      <div className="block lg:hidden my-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {days.map((d, index) => {
            const isSelected = index === selectedDayIndex;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDayIndex(index)}
                className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 border transition-all ${
                  isSelected
                    ? 'border-ember bg-ember/15 text-parchment font-semibold'
                    : d.isToday
                    ? 'border-gold/50 bg-stone/40 text-gold'
                    : 'border-ash/15 bg-obsidian text-ash hover:text-parchment'
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest">{d.dayName}</span>
                <span className="font-display text-base mt-0.5">{d.dayNumber}</span>
                {d.isToday && <span className="text-[8px] text-gold tracking-widest uppercase">Today</span>}
              </button>
            );
          })}
        </div>

        {/* Mobile Single Day Vertical List */}
        <div className="mt-4 border border-ash/20 bg-obsidian p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-ash/15 pb-2">
            <div>
              <span className="font-display text-base text-parchment tracking-widest uppercase">
                {selectedDay.dayName} · {selectedDay.date}
              </span>
              {selectedDay.isToday && (
                <span className="ml-2 text-[10px] border border-gold/40 px-1.5 py-0.2 text-gold uppercase">
                  Today
                </span>
              )}
            </div>
            <Button
              variant="secondary"
              className="text-xs py-1 px-2.5"
              onClick={() => handleOpenScheduleForDate(selectedDay.date)}
            >
              + Add Vow
            </Button>
          </div>

          {/* Main Quest Banner */}
          {selectedDay.mainQuest && (
            <div className="border border-ember/60 bg-ember/10 p-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] text-ember tracking-widest uppercase">
                  ★ Main Quest
                </span>
                <button
                  onClick={() => {
                    setQuestToSchedule(selectedDay.mainQuest);
                    setScheduleDialogOpen(true);
                  }}
                  className="text-[10px] text-ash/80 hover:text-parchment"
                >
                  Reschedule
                </button>
              </div>
              <p className="font-display text-sm text-parchment mt-1">
                {selectedDay.mainQuest.title}
              </p>
              <p className="text-[10px] text-ash/70 mt-0.5">
                {selectedDay.mainQuest.scheduledStartTime || 'Anytime'} · +20 XP / +10 G Bonus
              </p>
            </div>
          )}

          {/* Other Quests */}
          {selectedDay.quests.filter((q) => !q.isMainQuest).map((q) => (
            <div key={q.id} className="border border-ash/20 bg-stone/30 p-3 flex items-center justify-between">
              <div>
                <p className="font-display text-sm text-parchment">{q.title}</p>
                <p className="text-[10px] text-ash/70 uppercase">
                  {q.scheduledStartTime || 'Anytime'} · {q.attribute}
                </p>
              </div>
              <button
                onClick={() => {
                  setQuestToSchedule(q);
                  setScheduleDialogOpen(true);
                }}
                className="text-[11px] text-ash/70 hover:text-parchment border border-ash/20 px-2 py-1"
              >
                Move
              </button>
            </div>
          ))}

          {/* Routine instances */}
          {selectedDay.instances.map((inst) => (
            <div key={inst.id} className="border border-ash/15 bg-stone/20 p-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-xs text-parchment/90">{inst.title_snapshot}</p>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 border ${
                  inst.status === 'completed' ? 'border-gold text-gold bg-gold/10' : 'border-ash/20 text-ash/60'
                }`}>
                  {inst.status}
                </span>
              </div>
              <p className="text-[10px] text-ash/60 uppercase mt-0.5">
                {inst.scheduled_start_time || 'Anytime'} · {inst.attribute_snapshot} Routine
              </p>
            </div>
          ))}

          {selectedDay.quests.length === 0 && selectedDay.instances.length === 0 && (
            <p className="py-8 text-center text-xs text-ash/60">
              No vows scheduled for this day.
            </p>
          )}
        </div>
      </div>

      {/* Desktop 7-Day Planning Board Grid */}
      <div className="hidden lg:grid grid-cols-7 gap-3 mt-6 items-start">
        {days.map((day) => {
          const isCurrentToday = day.isToday;

          return (
            <div
              key={day.date}
              className={`flex flex-col border transition-colors min-h-[520px] ${
                isCurrentToday
                  ? 'border-gold/50 bg-obsidian/90 shadow-[0_0_15px_rgba(198,161,91,0.08)]'
                  : 'border-ash/20 bg-obsidian/60'
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3 text-center border-b ${
                  isCurrentToday
                    ? 'border-gold/30 bg-gold/10'
                    : 'border-ash/15 bg-stone/30'
                }`}
              >
                <span className="font-display text-[10px] tracking-widest text-ash/80 uppercase block">
                  {day.dayName}
                </span>
                <span className="font-display text-lg text-parchment block mt-0.5">
                  {day.dayNumber}
                </span>
                {isCurrentToday && (
                  <span className="inline-block mt-1 font-display text-[9px] tracking-widest text-gold uppercase border border-gold/40 px-1.5 py-0.2">
                    Today
                  </span>
                )}
              </div>

              {/* Items Area */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                {/* Main Quest Highlight Card */}
                {day.mainQuest && (
                  <div className="border border-ember/60 bg-ember/15 p-2.5 relative group">
                    <span className="text-[9px] font-display text-ember uppercase tracking-widest flex items-center gap-1">
                      ★ Main Quest
                    </span>
                    <p className="font-display text-xs text-parchment mt-1 leading-snug line-clamp-2">
                      {day.mainQuest.title}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-ash/70">
                      <span>{day.mainQuest.scheduledStartTime || 'Anytime'}</span>
                      <button
                        onClick={() => {
                          setQuestToSchedule(day.mainQuest);
                          setScheduleDialogOpen(true);
                        }}
                        className="text-ember hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                )}

                {/* Regular Scheduled Quests */}
                {day.quests
                  .filter((q) => !q.isMainQuest)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="border border-ash/20 bg-stone/40 p-2 text-xs relative group hover:border-ash/40 transition-colors"
                    >
                      <p className="font-display text-[11px] text-parchment leading-tight line-clamp-2">
                        {q.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[9px] text-ash/70">
                        <span className="uppercase">{q.scheduledStartTime || 'Anytime'} · {q.attribute}</span>
                        <button
                          onClick={() => {
                            setQuestToSchedule(q);
                            setScheduleDialogOpen(true);
                          }}
                          className="text-parchment hover:text-ember opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Move
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Routine Instances */}
                {day.instances.map((inst) => (
                  <div
                    key={inst.id}
                    className="border border-ash/15 bg-stone/20 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-display text-parchment/80 truncate">
                        {inst.title_snapshot}
                      </span>
                      {inst.status === 'completed' && (
                        <span className="text-[8px] text-gold border border-gold/40 px-1">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-ash/50 uppercase mt-1">
                      {inst.scheduled_start_time || 'Anytime'} · Routine
                    </p>
                  </div>
                ))}

                {day.quests.length === 0 && day.instances.length === 0 && (
                  <p className="py-12 text-center text-[11px] text-ash/40 italic">
                    Unwritten
                  </p>
                )}
              </div>

              {/* Column Footer */}
              <div className="p-2 border-t border-ash/10">
                <button
                  onClick={() => handleOpenScheduleForDate(day.date)}
                  className="w-full text-center text-[10px] font-display tracking-wider text-ash/60 hover:text-parchment uppercase py-1 border border-dashed border-ash/15 hover:border-ash/30 transition-colors"
                >
                  + Add Vow
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <RoutineDialog
        isOpen={routineDialogOpen}
        onClose={() => setRoutineDialogOpen(false)}
        routineToEdit={routineToEdit}
        onSuccess={() => router.refresh()}
      />

      <QuestDialog
        isOpen={questDialogOpen}
        onClose={() => setQuestDialogOpen(false)}
        questToEdit={questToEdit}
        onSuccess={() => router.refresh()}
      />

      <ScheduleQuestDialog
        isOpen={scheduleDialogOpen}
        onClose={() => {
          setScheduleDialogOpen(false);
          setQuestToSchedule(null);
        }}
        quest={questToSchedule}
        defaultDate={defaultScheduleDate}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
