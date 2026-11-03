'use client';
import { Button } from '@/components/ui/button';
export default function Error({ reset }) {
  return (
    <main className="runtime-error">
      <h1>Something went wrong</h1>
      <p>Please try loading this screen again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
