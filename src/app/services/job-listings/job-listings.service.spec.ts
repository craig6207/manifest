import { TestBed } from '@angular/core/testing';

import { JobListingsService } from './job-listings.service';

describe('JobListingsService', () => {
  let service: JobListingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobListingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
