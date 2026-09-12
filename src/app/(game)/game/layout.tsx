import { HUD } from '@/components/game/hud';
import { Atmosphere } from '@/components/game/realm/atmosphere';

export default function GameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-void">
      <Atmosphere />
      <HUD />
      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}
