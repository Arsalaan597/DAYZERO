import { redirect } from 'next/navigation';
import { getActiveTrialsAction, getChronicleDataAction } from '@/lib/actions/chronicle';
import { ChronicleClient } from '@/components/game/chronicle/chronicle-client';

export const dynamic = 'force-dynamic';

export default async function ChroniclePage() {
  const [trialsRes, chronicleRes] = await Promise.all([
    getActiveTrialsAction(),
    getChronicleDataAction(),
  ]);

  if (!trialsRes.success || !chronicleRes.success) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen pb-16">
      <ChronicleClient
        initialTrials={trialsRes.data || []}
        initialChronicle={
          chronicleRes.data || {
            inscriptions: [],
            earnedCount: 0,
            totalCount: 0,
            latestEarned: null,
          }
        }
      />
    </main>
  );
}
