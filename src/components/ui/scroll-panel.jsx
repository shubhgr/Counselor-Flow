import { cn } from '@/lib/utils';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';

/**
 * Scroll card body: header with progressive blur (no solid fill) overlays the
 * scroller so list/table rows fade up into it. Head sits outside overflow so
 * filter menus are not clipped.
 */
export function ScrollPanel({
  className,
  head,
  children,
  footer,
  toolbar = false,
  viewportClassName,
  bodyClassName,
  ...props
}) {
  return (
    <div className={cn('scroll-panel', toolbar && 'has-toolbar', className)} {...props}>
      <div className={cn('scroll-panel-head', toolbar && 'is-toolbar')}>
        <ProgressiveBlur
          position="top"
          backgroundColor="var(--surface)"
          blurAmount={14}
          className="scroll-panel-head-blur"
        />
        <div className="scroll-panel-head-content panel-head">{head}</div>
      </div>
      <div className={cn('scroll-panel-viewport', viewportClassName)}>
        <div className={cn('scroll-panel-body', bodyClassName)}>{children}</div>
      </div>
      {footer ? <div className="scroll-panel-footer">{footer}</div> : null}
    </div>
  );
}

/** Sticky progressive-blur band for table column headers (no title row). */
export function StickyScrollBlur({ className }) {
  return (
    <div className={cn('scroll-sticky-blur-band', className)} aria-hidden="true">
      <ProgressiveBlur
        position="top"
        backgroundColor="var(--surface)"
        blurAmount={14}
        className="scroll-panel-head-blur"
      />
    </div>
  );
}
