'use client';

// ---------------------------------------------------------------------------
// DAYZERO – Today Run Timeline Component
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zeroflame } from '@/components/game/realm/zeroflame';
import { TodayActivityCard } from '@/components/game/today/today-activity-card';
import { RewardReveal } from '@/components/game/quests/reward-reveal';
import { completeRoutineInstanceAction } from '@/lib/actions/routines';
import { completeQuestAction } from '@/lib/actions/quests';
import { updateTimezoneAction } from '@/lib/actions/profile';
import { Button } from '@/components/ui/button';
import type { TodayActivity, QuestCompletionResult } from '@/types/game';
import type { ProfileRow } from '@/types/database';

interface TodayTimelineProps {
  initialProfile: ProfileRow | null;
  localToday: string;
  userTz: string;
  initialActivities: TodayActivity[];
}

export function TodayTimeline({
  initialProfile,
  localToday,
  userTz,
  initialActivities,
}: TodayTimelineProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<TodayActivity[]>(initialActivities);
  const [profile, setProfile] = useState<ProfileRow | null>(initialProfile);
  const [revealResult, setRevealResult] = useState<QuestCompletionResult | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncingTz, setSyncingTz] = useState(false);

  // Check if browser timezone differs from saved profile timezone
  const browserTz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : userTz;
  const showTzNotice = browserTz && browserTz !== userTz;

  async function handleSyncTimezone() {
    if (!browserTz || syncingTz) return;
    setSyncingTz(true);
    try {
      const res = await updateTimezoneAction(browserTz);
      if (res.success) {
        router.refresh();
      }
    } finally {
      setSyncingTz(false);
    }
  }

  // Format date header deterministically
  const [year, month, day] = localToday.split('-').map(Number);
  const localDateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const formattedDayOfWeek = dayNames[localDateObj.getUTCDay()];
  const formattedDate = `${day} ${monthNames[month - 1]} ${year}`;

  const completedCount = activities.filter((a) => a.isCompleted).length;
  const totalCount = activities.length;
  const mainQuest = activities.find((a) => a.isMainQuest);
  const regularActivities = activities.filter((a) => !a.isMainQuest);

  async function handleCompleteActivity(activity: TodayActivity) {
    setErrorMessage(null);
    setPendingId(activity.id);

    try {
      let res: { success: boolean; error?: string; data?: QuestCompletionResult };

      if (activity.type === 'routine' && activity.sourceInstanceId) {
        res = await completeRoutineInstanceAction(activity.sourceInstanceId);
      } else if (activity.type === 'quest' && activity.sourceQuestId) {
        res = await completeQuestAction(activity.sourceQuestId);
      } else {
        throw new Error('Unknown activity source');
      }

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to complete activity.');
        return;
      }

      const completionData = res.data;

      // Update local state with authoritative progression
      setActivities((prev) =>
        prev.map((item) =>
          item.id === activity.id
            ? { ...item, isCompleted: true, completedAt: new Date().toISOString() }
            : item
        )
      );

      if (profile) {
        setProfile({
          ...profile,
          xp: completionData.totalXp,
          gold: completionData.newGold,
          level: completionData.newLevel,
          streak: completionData.newStreak,
        });
      }

      // Authoritative reward reveal popup
      setRevealResult(completionData);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during completion.');
    } finally {
      setPendingId(null);
    }
  }

  function handleDismissReveal() {
    setRevealResult(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      {/* Timezone sync suggestion if detected mismatch */}
      {showTzNotice && (
        <div className="mb-6 flex items-center justify-between border border-gold/30 bg-gold/5 px-4 py-2 text-xs text-parchment">
          <span>
            Detected device timezone: <strong className="text-gold">{browserTz}</strong> (Stored: {userTz})
          </span>
          <Button
            variant="secondary"
            className="text-[11px] py-1 px-2.5"
            disabled={syncingTz}
            onClick={handleSyncTimezone}
          >
            {syncingTz ? 'Updating...' : 'Sync Timezone'}
          </Button>
        </div>
      )}

      {/* Header with Zeroflame & Date */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-ash/15 pb-6">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-ember uppercase">
            Today&apos;s Run · {userTz}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl tracking-widest text-parchment uppercase">
            {formattedDayOfWeek}
          </h1>
          <p className="mt-0.5 text-xs tracking-wider text-ash/80">
            {formattedDate}
          </p>
        </div>

        {/* Zeroflame Heartbeat on Today */}
        <div className="flex items-center gap-4 bg-obsidian/60 border border-ash/15 px-4 py-3">
          <Zeroflame streak={profile?.streak ?? 0} size="sm" showLabel={false} />
          <div className="text-left">
            <p className="font-display text-[10px] tracking-[0.2em] text-ember uppercase">
              Zeroflame
            </p>
            <p className="font-display text-sm text-parchment">
              {profile?.streak ?? 0}-Day Streak
            </p>
            <p className="text-[10px] text-ash/70">
              {completedCount > 0 ? 'Today Secured' : 'Awaiting ignition'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress & Microcopy banner */}
      <div className="mt-6 flex items-center justify-between text-xs text-ash/80">
        <span className="tracking-wider">
          {totalCount === 0
            ? 'The ember waits.'
            : completedCount === totalCount
            ? 'The day was won here.'
            : `${totalCount - completedCount} ${totalCount - completedCount === 1 ? 'vow remains' : 'vows remain'}.`}
        </span>
        {totalCount > 0 && (
          <span className="font-mono text-parchment">
            {completedCount} / {totalCount} Cleared
          </span>
        )}
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 border border-ember/60 bg-ember/10 p-3 text-xs text-parchment"
        >
          <span className="font-display text-ember font-semibold">Error: </span>
          {errorMessage}
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 ? (
        <div className="my-12 flex flex-col items-center justify-center border border-dashed border-ash/20 bg-obsidian/40 p-8 text-center sm:p-12">
          <div className="text-ember text-2xl">✧</div>
          <h2 className="mt-3 font-display text-base sm:text-lg tracking-widest text-parchment uppercase">
            Seven Days. Nothing Written Yet.
          </h2>
          <p className="mt-1.5 max-w-sm text-xs text-ash/80 leading-relaxed">
            Your real life builds your character. Add recurring daily habits or plan your week to awaken the dormant realm.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/game/week">
              <Button variant="primary" className="text-xs py-2 px-5 tracking-wider uppercase">
                Plan Your Week
              </Button>
            </Link>
            <Link href="/game/quests">
              <Button variant="secondary" className="text-xs py-2 px-5 tracking-wider uppercase">
                Browse Quests
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* The Active Timeline & Ember Path */
        <div className="relative mt-8 space-y-6">
          {/* Main Quest Highlight Section if present */}
          {mainQuest && (
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-ember text-xs">★</span>
                <span className="font-display text-xs tracking-[0.25em] text-ember uppercase">
                  Primary Directive
                </span>
                <span className="h-px flex-1 bg-ember/30" />
              </div>
              <TodayActivityCard
                activity={mainQuest}
                onComplete={handleCompleteActivity}
                isPending={pendingId === mainQuest.id}
              />
            </div>
          )}

          {/* Regular Scheduled Timeline */}
          {regularActivities.length > 0 && (
            <div className="relative">
              {/* Vertical Ember Path Spine */}
              <div
                className="absolute top-4 bottom-4 left-4 sm:left-6 w-0.5 bg-gradient-to-b from-ember/60 via-ash/30 to-ash/10"
                aria-hidden="true"
              />

              <div className="space-y-6 pl-8 sm:pl-12">
                {regularActivities.map((activity, idx) => (
                  <div key={activity.id} className="relative">
                    {/* Node Dot on Ember Path */}
                    <div
                      className={`absolute -left-8 sm:-left-12 top-5 flex h-4 w-4 sm:h-5 sm:w-5 -translate-x-1/2 items-center justify-center rounded-full border ${
                        activity.isCompleted
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-ember bg-obsidian text-ember'
                      } text-[9px]`}
                      aria-hidden="true"
                    >
                      {activity.isCompleted ? '✓' : idx + 1}
                    </div>

                    <TodayActivityCard
                      activity={activity}
                      onComplete={handleCompleteActivity}
                      isPending={pendingId === activity.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Authoritative Reward Reveal Modal */}
      <RewardReveal result={revealResult} onDismiss={handleDismissReveal} />
    </div>
  );
}
