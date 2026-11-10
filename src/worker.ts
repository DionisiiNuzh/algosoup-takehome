interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

import { fetchLatestReviews, ReviewInputError } from './reviews.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    if (pathname === '/api/reviews') {
      if (request.method !== 'POST') {
        return Response.json({ error: 'Use POST' }, { status: 405, headers: { Allow: 'POST' } });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return Response.json({ error: 'Expected a JSON object' }, { status: 400 });
      }
      try {
        return Response.json(await fetchLatestReviews({
          app: 'app' in body ? body.app : undefined,
          count: 'count' in body ? body.count : undefined,
        }), { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (error instanceof ReviewInputError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        console.error('Review fetch failed:', error instanceof Error ? error.message : String(error));
        return Response.json({ error: 'Could not fetch Google Play reviews. Please try again.' }, { status: 502 });
      }
    }

    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
