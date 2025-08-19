import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('../home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'timesheets',
        loadComponent: () =>
          import('../timesheets/timesheets.page').then((m) => m.TimesheetsPage),
      },
      {
        path: 'timesheets-edit',
        loadComponent: () =>
          import('../timesheets/timesheets-edit/timesheets-edit.page').then(
            (m) => m.TimesheetsEditPage
          ),
      },
      {
        path: 'job-search',
        loadComponent: () =>
          import('../job-search/job-search.page').then((m) => m.JobSearchPage),
      },
      {
        path: 'check-in-out',
        loadComponent: () =>
          import('../check-in-out/check-in-out.page').then(
            (m) => m.CheckInOutPage
          ),
      },
      {
        path: 'job-history',
        loadComponent: () =>
          import('../job-history/job-history.page').then(
            (m) => m.JobHistoryPage
          ),
      },
      {
        path: 'certificate-management',
        loadComponent: () =>
          import('../certificate-management/certificate-management.page').then(
            (m) => m.CertificateManagementPage
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('../profile/profile.routes').then((m) => m.profileRoutes),
      },
    ],
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
];
