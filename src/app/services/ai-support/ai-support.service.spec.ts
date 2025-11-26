import { TestBed } from '@angular/core/testing';
import { AiSupportService } from './ai-support.service';
describe('AiSupportService', () => {
  let service: AiSupportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiSupportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
