import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./public/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./public/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verify-code',
    loadComponent: () =>
      import('./public/verify-code/verify-code.page').then(
        (m) => m.VerifyCodePage
      ),
  },
  {
    path: 'profile-setup',
    loadComponent: () =>
      import('./public/profile-setup/profile-setup.page').then(
        (m) => m.ProfileSetupPage
      ),
  },
  {
    path: 'secure',
    loadChildren: () =>
      import('./secure/tabs/tabs.routes').then((m) => m.routes),
  },
];
