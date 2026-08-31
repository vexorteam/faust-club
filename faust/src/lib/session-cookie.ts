/**
 * Name of the httpOnly cookie that carries the API session token.
 *
 * It lives in its own module because the middleware needs it too, and the
 * middleware must not pull in `next/headers` or the API client.
 */
export const SESSION_COOKIE = "faust_session"
