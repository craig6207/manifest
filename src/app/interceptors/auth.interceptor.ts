import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/api/auth/')) return next(req);

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => {
      if (!token) return next(req);
      return next(
        req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      );
    })
  );
};
