/** Wrap internal paths so guests are prompted to register first; Clerk returns here after sign-up. */
export function signUpUrlForAppPath(path: string): string {
  const safe = path.startsWith("/") ? path : `/${path}`;
  return `/sign-up?redirect_url=${encodeURIComponent(safe)}`;
}

export function signInUrlForAppPath(path: string): string {
  const safe = path.startsWith("/") ? path : `/${path}`;
  return `/sign-in?redirect_url=${encodeURIComponent(safe)}`;
}
