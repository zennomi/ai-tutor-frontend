export default function TestTakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100svh] w-full overflow-hidden bg-background">
      {children}
    </div>
  );
}
