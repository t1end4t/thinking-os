// Display-only path shortening. Never feed the result back to the filesystem API.
// ponytail: assumes the app runs as the only user under /home/<name> or /Users/<name>.
// If multi-user paths ever show up, pass the server-reported `home` in instead.
export const tildePath = (value: string): string =>
  value ? value.replace(/^\/(?:home|Users)\/[^/]+(?=\/|$)/, '~') : value;
