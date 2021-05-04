'use strict';

import { UserManager, WebStorageStateStore, Log } from 'oidc-client';
const urls = {};
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';

const apiUrl = sessionStorage.getItem('apiUrl');
const mode = sessionStorage.getItem('mode');
// we need the keycloak object to be able to use update token

// let keycloak = null;
let authService = null;

export function refreshToken(keycloak, minValidity) {
  return new Promise((resolve, reject) => {
    keycloak
      .updateToken(minValidity)
      .success(function(refreshed) {
        if (refreshed) {
          // console.log("Token was successfully refreshed");
        } else {
          // console.log("Token is still valid");
        }
        resolve();
      })
      .error(function() {
        reject();
      });
  });
}

export async function login(username, password, keycloak) {
  sessionStorage.setItem('username', username.user);
  sessionStorage.setItem('displayName', username.user); //TODO: change with fullname
  if (keycloak) {
    this.keycloak = keycloak;
  }
}

export function logout() {
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('displayName');
  if (mode === 'lite') {
    sessionStorage.removeItem('header');
  }
  sessionStorage.removeItem('lastSavedAim');
}

export function getCurrentUser() {
  return sessionStorage.getItem('username');
}

// export async function getAuthHeader() {
//   if (this.keycloak) {
//     try {
//       await refreshToken(this.keycloak, 5);
//       const header = `Bearer ${this.keycloak.token}`;
//       if (header) {
//         cornerstoneWADOImageLoader.configure({
//           beforeSend: function(xhr) {
//             xhr.setRequestHeader('Authorization', header);
//           }
//         });
//         return header;
//       }
//     } catch (err) {
//       this.keycloak.logout();
//     }
//   }
//   return undefined;
// }

export async function getAuthHeader() {
  authService = new AuthService();
  try {
    const user = await authService.getUser();
    if (user.access_token) {
      // TODO: refresh token
      const header = `Bearer ${user.access_token}`;
      if (header) {
        cornerstoneWADOImageLoader.configure({
          beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', header);
          }
        });
        return header;
      }
    }
    console.log(' ----------->>>>>>>>>>> user in getAuthHeader', user);
  } catch (err) {
    authService.logout();
  }
  return undefined;
}

export class AuthService {
  UserManager;
  constructor() {
    this.authority = sessionStorage.getItem('authority');
    this.client_id = sessionStorage.getItem('client_id');
    this.redirect_uri = sessionStorage.getItem('redirect_uri');
    this.response_type = sessionStorage.getItem('response_type');
    this.scope = sessionStorage.getItem('scope');
    this.UserManager = new UserManager({
      authority: this.authority,
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      response_type: this.response_type,
      scope: this.scope,
      silent_redirect_uri: this.redirect_uri,
      automaticSilentRenew: true,
      loadUserInfo: true,
      post_logout_redirect_uri: this.redirect_uri,
      userStore: new WebStorageStateStore({ store: window.sessionStorage })
    });
    // Logger
    Log.logger = console;
    Log.level = Log.DEBUG;
    this.UserManager.events.addUserLoaded(user => {
      console.log('in the event', user);
      // if (window.location.href.indexOf('signin-oidc') !== -1) {
      //   this.navigateToScreen();
      // }
    });

    this.UserManager.events.addSilentRenewError(e => {
      console.log('silent renew error', e.message);
    });

    this.UserManager.events.addAccessTokenExpired(() => {
      this.logout();
    });
  }

  signinRedirectCallback = async () => {
    const user = await this.UserManager.signinRedirectCallback();
    console.log('callback user', user);
    return user;
  };

  getUser = async () => {
    let user = await this.UserManager.getUser();
    if (!user) {
      user = await this.UserManager.signinRedirectCallback();
      console.log('user in redirect', userRes);
      window.alert(userRes);
      return userRes;
    }
    return user;
  };

  parseJwt = token => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
  };

  signinRedirect = async () => {
    localStorage.setItem('redirectUri', window.location.pathname);
    await this.UserManager.signinRedirect({});
  };

  signinRedirectPopUp = () => {
    localStorage.setItem('redirectUri', window.location.pathname);
    this.UserManager.signinPopup({});
  };

  navigateToScreen = () => {
    window.location.replace('/');
  };

  isAuthenticated = () => {
    const oidcStorage = JSON.parse(
      sessionStorage.getItem(
        // `oidc.user:${process.env.REACT_APP_AUTH_URL}:${process.env.REACT_APP_IDENTITY_CLIENT_ID}`
        `oidc.user:${this.authority}:epad-auth`
      )
    );
    return !!oidcStorage && !!oidcStorage.access_token;
  };

  signinSilent = () => {
    this.UserManager.signinSilent()
      .then(user => {})
      .catch(err => {
        console.log(err);
      });
  };
  signinSilentCallback = () => {
    this.UserManager.signinSilentCallback();
  };

  createSigninRequest = () => {
    return this.UserManager.createSigninRequest();
  };

  logout = () => {
    console.log(' +++ logout called in class +++ ');
    this.UserManager.signoutRedirect({
      id_token_hint: localStorage.getItem('id_token')
    });
    // this.UserManager.signoutRedirect();
    this.UserManager.clearStaleState();
    window.location.replace(this.redirect_uri);
  };

  signoutRedirectCallback = () => {
    this.UserManager.signoutRedirectCallback().then(() => {
      localStorage.clear();
      // window.location.replace(process.env.REACT_APP_PUBLIC_URL);
      window.location.replace(this.redirect_uri);
    });
    this.UserManager.clearStaleState();
  };
}

export default {
  login,
  logout,
  getCurrentUser,
  getAuthHeader,
  refreshToken,
  AuthService
};
