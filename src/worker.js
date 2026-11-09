export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
