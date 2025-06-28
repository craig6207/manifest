import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./secure/home/home.page').then((m) => m.HomePage),
  },
];
