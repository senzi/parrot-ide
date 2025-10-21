import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequestGet: PagesFunction = async (context) => {
  const data = {
    message: "Hello from the functions directory!",
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
