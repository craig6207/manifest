import { InjectionToken } from '@angular/core';
import { Environment } from '../interfaces/environment';

/**
 * @const ENVIRONMENT
 * Injection token for the environment interface to be provided by the application.
 */
export const ENVIRONMENT: InjectionToken<Environment> = new InjectionToken(
  'ENVIRONMENT'
);
