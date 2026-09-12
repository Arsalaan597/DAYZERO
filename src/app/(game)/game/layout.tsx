import { HUD } from '@/components/game/hud';

export default function GameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-void">
      <HUD />
      <main className="flex-1">{children}</main>
    </div>
  );
}
