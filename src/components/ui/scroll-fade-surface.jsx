import { cn } from '@/lib/utils';

/** Plain scroll body used when the sticky blurred head lives in ScrollPanel. */
export function ScrollFadeSurface({ className, children, ...props }) {
  return (
    <div className={cn('scroll-fade-surface', className)} {...props}>
      <div className="scroll-fade-content">{children}</div>
    </div>
  );
}
