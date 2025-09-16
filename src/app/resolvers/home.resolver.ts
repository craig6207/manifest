import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of, catchError, forkJoin, map, tap } from 'rxjs';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { NotificationsService } from '../services/notification/notification.service';

export const homeJobCountResolver: ResolveFn<number> = () => {
  const profileStore = inject(ProfileStore);
  const jobListingService = inject(JobListingsService);
  const notificationsService = inject(NotificationsService);

  const profile = profileStore.profile();
  const userId = (profile as any)?.userId;
  if (!userId) return of(0);

  const jobCount$ = jobListingService
    .getCandidateJobCount(userId, { includePast: false })
    .pipe(catchError(() => of(0)));

  const unreadCount$ = notificationsService.getUnreadCount().pipe(
    tap((count) => profileStore.setUnreadNotificationCount(count)),
    catchError(() => of(0))
  );

  return forkJoin([jobCount$, unreadCount$]).pipe(
    map(([jobCount]) => jobCount)
  );
};
