import { TestBed } from '@angular/core/testing';

import { JobPlacementService } from './job-placement.service';

describe('JobPlacementService', () => {
  let service: JobPlacementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobPlacementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
