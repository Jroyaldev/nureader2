import { Suspense } from 'react';

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted">Loading reader...</div>
      </div>
    }>
      {children}
    </Suspense>
  );
}