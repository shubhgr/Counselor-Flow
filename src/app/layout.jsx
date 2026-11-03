import { Suspense } from 'react';
import '@fontsource-variable/inter';
import './globals.css';
import { RuntimeProvider } from '@/components/runtime-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
export const metadata = {
  title: 'GradRight Counselor',
  description: 'Counselor marketplace and workspace',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Suspense
          fallback={
            <div className="screen-loading" role="status">
              Loading Counselor…
            </div>
          }
        >
          <TooltipProvider>
            <RuntimeProvider>{children}</RuntimeProvider>
          </TooltipProvider>
        </Suspense>
      </body>
    </html>
  );
}
