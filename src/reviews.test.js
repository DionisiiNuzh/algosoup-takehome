import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestReviews, parseAppId, ReviewInputError } from './reviews.js';
import worker from './worker.js';

test('accepts Play URLs and rejects other hosts before fetching', async () => {
  assert.equal(parseAppId('https://play.google.com/store/apps/details?id=com.test.app&hl=en'), 'com.test.app');
  await assert.rejects(fetchLatestReviews({ app: 'https://example.com/?id=com.test.app' }), ReviewInputError);
  for (const count of [0, 19, 201, 2.5, '100', null]) {
    await assert.rejects(fetchLatestReviews({ app: 'com.test.app', count }), ReviewInputError);
  }
});

test('fetches newest reviews, normalizes evidence and counts unique nonempty reviews', async () => {
  const scraper = {
    sort: { NEWEST: 2 },
    async reviews(options) {
      assert.equal(options.sort, 2);
      assert.equal(options.num, 20);
      assert.equal(options.lang, 'en');
      assert.equal(options.country, 'gb');
      const transport = { cookieJar: {} };
      options.requestOptions.hooks.beforeRequest[0](transport);
      assert.equal(transport.cookieJar, undefined);
      return { data: [
        { id: 'a', text: 'Sign in fails', score: 1 },
        { id: 'a', text: 'Duplicate' },
        { id: 'b', text: ' ' },
        { id: 'c', text: 'Useful', score: 5, replyText: 'Thanks' },
      ] };
    },
  };
  const result = await fetchLatestReviews({ app: 'com.test.app', count: 20 }, scraper);
  assert.equal(result.fetchedCount, 2);
  assert.equal(result.requestedCount, 20);
  assert.equal(result.reviews[0].appVersion, null);
  assert.deepEqual(result.reviews[1].developerReply, { text: 'Thanks', repliedAt: null });
});

test('API rejects incorrect methods, malformed bodies and invalid input', async () => {
  for (const [method, body, expected] of [
    ['GET', undefined, 405],
    ['POST', '{', 400],
    ['POST', 'null', 400],
    ['POST', JSON.stringify({ app: 'invalid' }), 400],
  ]) {
    const response = await worker.fetch(new Request('https://example.test/api/reviews', { method, body }), {});
    assert.equal(response.status, expected);
  }
});
