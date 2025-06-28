export interface Environment {
  apiEndpoint: string;
  production: boolean;
  version: string;
  authConfig: AuthConfig[];
}

export interface AuthConfig {
  authority: string;
  redirectUrl: string;
  postLogoutRedirectUri: string;
  clientId: string;
  scope: string;
  responseType: string;
  useRefreshToken: boolean;
  silentRenew: boolean;
  configId: string;
  autoUserInfo: boolean;
  secureRoutes: string[];
}
