import { redirect } from 'next/navigation';
import { getWeekData } from '@/lib/game/scheduler';
import { WeekBoard } from '@/components/game/week/week-board';

export const dynamic = 'force-dynamic';

export default async function WeekPage() {
  const data = await getWeekData();

  if (!data) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen pb-16">
      <WeekBoard
        userTz={data.userTz}
        localToday={data.localToday}
        startDateStr={data.startDateStr}
        endDateStr={data.endDateStr}
        days={data.days}
        routines={data.routines}
        unscheduledQuests={data.unscheduledQuests}
      />
    </main>
  );
}
