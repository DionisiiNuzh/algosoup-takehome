import { fetchLatestReviews, ReviewInputError } from './reviews.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    if (pathname === '/api/reviews') {
      if (request.method !== 'POST') {
        return Response.json({ error: 'Use POST' }, { status: 405, headers: { Allow: 'POST' } });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return Response.json({ error: 'Expected a JSON object' }, { status: 400 });
      }
      try {
        return Response.json(await fetchLatestReviews(body), { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (error instanceof ReviewInputError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        console.error('Review fetch failed:', error.message);
        return Response.json({ error: 'Could not fetch Google Play reviews. Please try again.' }, { status: 502 });
      }
    }

    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
