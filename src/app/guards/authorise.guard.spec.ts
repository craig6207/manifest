import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { authoriseGuard } from './authorise.guard';

describe('authoriseGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => authoriseGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
