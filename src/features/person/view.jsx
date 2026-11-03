'use client';
import { memo } from 'react';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions person-top-actions'} id={'person-top-actions'} />
      </PageActions>
      <div className={'content person-page gr-scroll'} id={'person-root'}>
        <p className={'hint-text'}>{'Loading profile…'}</p>
      </div>
    </>
  );
});
