import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'personal-details',
    loadComponent: () =>
      import('./personal-details/personal-details.page').then(
        (m) => m.PersonalDetailsPage
      ),
  },
  {
    path: 'job-preferences',
    loadComponent: () =>
      import('./job-preferences/job-preferences.page').then(
        (m) => m.JobPreferencesPage
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.page').then((m) => m.AboutPage),
  },
  {
    path: 'cookies',
    loadComponent: () =>
      import('./cookies/cookies.page').then((m) => m.CookiesPage),
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./support/support.page').then((m) => m.SupportPage),
  },
  {
    path: 'certificate-management',
    loadComponent: () =>
      import('./certificate-management/certificate-management.page').then(
        (m) => m.CertificateManagementPage
      ),
  },
];
