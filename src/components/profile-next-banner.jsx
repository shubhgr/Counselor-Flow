import Link from 'next/link';
import { Icon } from '@/components/icon';

export function ProfileNextBanner() {
  return (
    <div className="pending-banner profile-next-banner" data-unverified-only={''}>
      <div className={'icon'}>
        <Icon name="schedule" className={'app-icon'} aria-hidden={'true'} />
      </div>
      <div>
        <h3>{"What's next"}</h3>
        <p>
          {
            'Fill in any missing profile details while GradRight reviews your listing. Students can find you once you’re approved.'
          }
        </p>
      </div>
      <Link className={'btn btn-primary btn-sm'} href={'/profile?tab=edit'} prefetch={false}>
        {'Complete profile'}
      </Link>
    </div>
  );
}
