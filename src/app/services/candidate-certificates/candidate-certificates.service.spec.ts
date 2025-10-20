import { TestBed } from '@angular/core/testing';

import { CandidateCertificatesService } from './candidate-certificates.service';

describe('CandidateCertificatesService', () => {
  let service: CandidateCertificatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandidateCertificatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
