import type { Access } from 'payload'

// Read is gated behind authentication; the web SSG build reads with an API key.
// Images are public via R2's own domain, so Media read can be gated too.
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
