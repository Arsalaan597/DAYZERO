import { redirect } from 'next/navigation';
import { getTodayData } from '@/lib/game/scheduler';
import { TodayTimeline } from '@/components/game/today/today-timeline';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const data = await getTodayData();

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
      />
    </main>
  );
}
