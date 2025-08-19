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
    path: 'profile-edit',
    loadComponent: () =>
      import('./profile-edit/profile-edit.page').then((m) => m.ProfileEditPage),
  },
  {
    path: 'job-preferences',
    loadComponent: () =>
      import('./job-preferences/job-preferences.page').then(
        (m) => m.JobPreferencesPage
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/notifications.page').then(
        (m) => m.NotificationsPage
      ),
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
];
