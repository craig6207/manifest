export const environment = {
  production: false,
  version: '1.0.0.0',
  apiEndpoint:
    'https://df-recruit-api-ckgqd9dgdab0eqcr.westeurope-01.azurewebsites.net',
  msalConfig: {
    auth: {
      clientId: '653ef398-27e0-4a27-8d63-70bd184d90b2',
      authority:
        'https://dfrecruittest.b2clogin.com/dfrecruittest.onmicrosoft.com/B2C_1_sign_in',
      knownAuthorities: ['dfrecruittest.b2clogin.com'],
      redirectUri: '/',
      postLogoutRedirectUri: '/',
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  },

  apiConfig: {
    uri: 'https://df-recruit-api-ckgqd9dgdab0eqcr.westeurope-01.azurewebsites.net',
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
