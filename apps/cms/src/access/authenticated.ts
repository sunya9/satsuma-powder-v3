import type { Access } from 'payload'

// Read is gated behind authentication (the web SSG build uses an API key).
// Media stays public so visitors' browsers can load images at runtime.
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
