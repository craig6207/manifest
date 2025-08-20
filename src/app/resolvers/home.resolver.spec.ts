import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom, isObservable } from 'rxjs';
import { homeJobCountResolver } from './home.resolver';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('homeJobCountResolver', () => {
  let profileStoreMock: { profile: jasmine.Spy };
  let jobListingServiceMock: { getCandidateJobCount: jasmine.Spy };
  let route: ActivatedRouteSnapshot;
  let state: RouterStateSnapshot;

  beforeEach(() => {
    profileStoreMock = { profile: jasmine.createSpy('profile') };
    jobListingServiceMock = {
      getCandidateJobCount: jasmine.createSpy('getCandidateJobCount'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileStore, useValue: profileStoreMock },
        { provide: JobListingsService, useValue: jobListingServiceMock },
      ],
    });
    route = {} as ActivatedRouteSnapshot;
    state = {} as RouterStateSnapshot;
  });

  it('returns the job count when userId exists', async () => {
    profileStoreMock.profile.and.returnValue({
      userId: 123,
      firstName: 'Alex',
    });
    jobListingServiceMock.getCandidateJobCount.and.returnValue(of(7));

    const maybe = TestBed.runInInjectionContext(() =>
      homeJobCountResolver(route, state)
    );
    const result$ = isObservable(maybe) ? maybe : of(maybe as number);
    const count = await firstValueFrom(result$);

    expect(jobListingServiceMock.getCandidateJobCount).toHaveBeenCalledOnceWith(
      123,
      { includePast: false }
    );
    expect(count).toBe(7);
  });

  it('returns 0 when userId is missing', async () => {
    profileStoreMock.profile.and.returnValue(null);

    const maybe = TestBed.runInInjectionContext(() =>
      homeJobCountResolver(route, state)
    );

    const result$ = isObservable(maybe) ? maybe : of(maybe as number);
    const count = await firstValueFrom(result$);

    expect(jobListingServiceMock.getCandidateJobCount).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('returns 0 when the service errors', async () => {
    profileStoreMock.profile.and.returnValue({ userId: 999 });
    jobListingServiceMock.getCandidateJobCount.and.returnValue(
      throwError(() => new Error('boom'))
    );

    const maybe = TestBed.runInInjectionContext(() =>
      homeJobCountResolver(route, state)
    );

    const result$ = isObservable(maybe) ? maybe : of(maybe as number);
    const count = await firstValueFrom(result$);

    expect(jobListingServiceMock.getCandidateJobCount).toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
