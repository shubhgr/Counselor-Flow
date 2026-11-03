import { cn } from '@/lib/utils';

/** Progressive backdrop blur adapted from Skiper UI's ProgressiveBlur,
 * by @gurvinder-singh02 (https://gxuri.me), inspired by devouringdetails.com.
 * Free-version attribution retained. No background color or tint is applied.
 */
export function ProgressiveBlur({ className, position = 'right', blurAmount = 20, ...props }) {
  const direction = { right: 'to right', left: 'to left', top: 'to top', bottom: 'to bottom' }[
    position
  ];
  return (
    <div aria-hidden="true" className={cn('progressive-blur', className)} {...props}>
      {[0.05, 0.1, 0.2, 0.4, 0.65, 1].map((strength, index) => {
        const start = index * 12;
        const mask = `linear-gradient(${direction}, transparent ${start}%, black ${Math.min(start + 22, 100)}%)`;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              inset: 0,
              maskImage: mask,
              WebkitMaskImage: mask,
              backdropFilter: `blur(${strength * blurAmount}px)`,
              WebkitBackdropFilter: `blur(${strength * blurAmount}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
