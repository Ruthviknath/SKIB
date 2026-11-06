// Client-side session storage. Swap for SecureStore/AsyncStorage in the mobile app.
const TOKEN_KEY = 'skib.token';
const PENDING_PHONE_KEY = 'skib.pendingPhone';

const hasWindow = () => typeof window !== 'undefined';

export const session = {
  getToken: () => (hasWindow() ? localStorage.getItem(TOKEN_KEY) : null),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    if (!hasWindow()) return;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PENDING_PHONE_KEY);
  },
  getPendingPhone: () => (hasWindow() ? sessionStorage.getItem(PENDING_PHONE_KEY) : null),
  setPendingPhone: (phone: string) => sessionStorage.setItem(PENDING_PHONE_KEY, phone),
};
