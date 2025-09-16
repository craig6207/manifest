import { TestBed } from '@angular/core/testing';

import { JobPipelineService } from './job-pipeline.service';

describe('JobPipelineService', () => {
  let service: JobPipelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobPipelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
