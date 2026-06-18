import { setupServer } from 'msw/node';

// Tests register their own handlers via server.use(...); the base server starts
// with none so an unmocked request fails loudly (onUnhandledRequest: 'error').
export const server = setupServer();
