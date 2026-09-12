import { redirect } from 'next/navigation';
import { getTodayData } from '@/lib/game/scheduler';
import { getActiveTrialsAction } from '@/lib/actions/chronicle';
import { TodayTimeline } from '@/components/game/today/today-timeline';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const [data, trialsRes] = await Promise.all([
    getTodayData(),
    getActiveTrialsAction(),
  ]);

  if (!data) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen pb-16">
      <TodayTimeline
        initialProfile={data.profile}
        localToday={data.localToday}
        userTz={data.userTz}
        initialActivities={data.activities}
        initialTrials={trialsRes.data || []}
      />
    </main>
  );
}

