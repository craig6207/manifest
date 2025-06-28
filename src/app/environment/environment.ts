export const environment = {
  production: false,
  version: '1.0.0.0',
  apiEndpoint: 'https://localhost:7001',
  msalConfig: {
    auth: {
      clientId: '0fb0577f-9070-4dcd-9f58-fdfcda3e5470',
      authority:
        'https://dfrecruittest.b2clogin.com/dfrecruittest.onmicrosoft.com/B2C_1_sign_in',
      knownAuthorities: ['dfrecruittest.b2clogin.com'],
      redirectUri: '/home',
      postLogoutRedirectUri: '/home',
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  },

  apiConfig: {
    uri: 'https://localhost:7001',
    scopes: [
      'https://dfrecruittest.onmicrosoft.com/dfrecruit/api/recruitment.write',
      'https://dfrecruittest.onmicrosoft.com/dfrecruit/api/recruitment.read',
    ],
  },

  b2cPolicies: {
    names: {
      signUpSignIn: 'B2C_1_sign_in',
      signUp: 'B2C_1_sign_up',
    },
    authorities: {
      signUpSignIn: {
        authority:
          'https://dfrecruittest.b2clogin.com/dfrecruittest.onmicrosoft.com/B2C_1_sign_in',
      },
      signUp: {
        authority:
          'https://dfrecruittest.b2clogin.com/dfrecruittest.onmicrosoft.com/B2C_1_sign_up',
      },
    },
    authorityDomain: 'dfrecruittest.b2clogin.com',
  },
};
