import { Routes } from '@angular/router';
import { authoriseCanMatch } from './guards/authorise.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/public/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/public/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/public/register/register.page').then(
        (m) => m.RegisterPage
      ),
  },
  {
    path: 'verify-code',
    loadComponent: () =>
      import('./pages/public/verify-code/verify-code.page').then(
        (m) => m.VerifyCodePage
      ),
  },
  {
    path: 'profile-setup',
    loadComponent: () =>
      import('./pages/public/profile-setup/profile-setup.page').then(
        (m) => m.ProfileSetupPage
      ),
  },

  { path: 'home', redirectTo: 'secure/tabs/home', pathMatch: 'full' },
  { path: 'jobs', redirectTo: 'secure/tabs/job-search', pathMatch: 'full' },
  {
    path: 'timesheet',
    redirectTo: 'secure/tabs/timesheets',
    pathMatch: 'full',
  },
  { path: 'profile', redirectTo: 'secure/tabs/profile', pathMatch: 'full' },
  {
    path: 'check-in-out',
    redirectTo: 'secure/tabs/check-in-out',
    pathMatch: 'full',
  },
  {
    path: 'job-history',
    redirectTo: 'secure/tabs/job-history',
    pathMatch: 'full',
  },
  {
    path: 'certificate-management',
    redirectTo: 'secure/tabs/certificate-management',
    pathMatch: 'full',
  },

  {
    path: 'secure',
    canMatch: [authoriseCanMatch],
    loadChildren: () =>
      import('./pages/secure/tabs/tabs.routes').then((m) => m.routes),
  },

  { path: '**', redirectTo: '' },
];
