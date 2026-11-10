import gplay from 'google-play-scraper';

export class ReviewInputError extends Error {}

export function parseAppId(app) {
  if (typeof app !== 'string') throw new ReviewInputError('app must be a package ID or Google Play URL');
  let appId = app.trim();
  if (/^https?:\/\//i.test(appId)) {
    const url = new URL(appId);
    if (url.protocol !== 'https:' || url.hostname !== 'play.google.com' || url.pathname !== '/store/apps/details') {
      throw new ReviewInputError('Use a Google Play app details URL');
    }
    appId = url.searchParams.get('id') || '';
  }
  if (!/^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(appId) || appId.length > 255) {
    throw new ReviewInputError('Invalid Android package ID');
  }
  return appId;
}

/** Fetch a bounded sample of the latest public reviews. Does not persist data. */
export async function fetchLatestReviews({ app, count = 100 } = {}, scraper = gplay) {
  const appId = parseAppId(app);
  if (!Number.isInteger(count) || count < 20 || count > 200) {
    throw new ReviewInputError('count must be an integer between 20 and 200');
  }
  const { data } = await scraper.reviews({
    appId,
    num: count,
    sort: scraper.sort.NEWEST,
    lang: 'en',
    country: 'gb',
    paginate: false,
    requestOptions: {
      timeout: { request: 15000 },
      retry: { limit: 0 },
      // Workers' Node HTTP shim exposes Set-Cookie differently from Node.
      // Avoid got's cookie-jar parser; Google Play's review RPC accepts the
      // continuation token without a cookie jar.
      hooks: { beforeRequest: [(options) => { options.cookieJar = undefined; }] },
    },
  });
  if (!Array.isArray(data)) throw new Error('Unexpected Google Play response');
  const seen = new Set();
  const reviews = data.filter((review) => {
    if (!review.id || typeof review.text !== 'string' || !review.text.trim() || seen.has(review.id)) return false;
    seen.add(review.id);
    return true;
  }).slice(0, count).map((review) => ({
    reviewId: review.id,
    appId,
    authorName: review.userName ?? null,
    text: review.text,
    rating: [1, 2, 3, 4, 5].includes(review.score) ? review.score : null,
    reviewedAt: review.date ?? null,
    helpfulCount: review.thumbsUp ?? null,
    appVersion: review.version ?? null,
    sourceUrl: review.url ?? null,
    developerReply: review.replyText ? {
      text: review.replyText,
      repliedAt: review.replyDate ?? null,
    } : null,
  }));
  return {
    appId,
    language: 'en',
    country: 'gb',
    sort: 'newest',
    requestedCount: count,
    fetchedCount: reviews.length,
    fetchedAt: new Date().toISOString(),
    reviews,
  };
}
