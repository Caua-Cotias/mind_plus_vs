import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CatalogApiError, createCatalogApi } from '../src/lib/catalog-client.ts';
import { resolveApiBaseURL } from '../src/lib/api-url.ts';

const emptyPage = (pageSize) => ({
  items: [],
  pagination: {
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

function series(overrides = {}) {
  return {
    id: 'series-1',
    slug: 'example-series',
    title: 'Série de teste',
    synopsis: 'Sinopse recebida pela API.',
    posterUrl: null,
    ageRating: null,
    categories: [],
    publishedAt: '2026-11-16T12:00:00.000Z',
    ...overrides,
  };
}

function envelope(data) {
  return { success: true, data };
}

function paginated(items, pageSize = items.length || 20) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize,
      totalItems: items.length,
      totalPages: items.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function seriesDetail(overrides = {}) {
  return {
    ...series(),
    description: 'Descrição editorial complementar.',
    featuredImageUrl: 'https://cdn.example.test/series/hero.jpg',
    ...overrides,
  };
}

function episode(overrides = {}) {
  return {
    id: 'episode-1',
    episodeNumber: 1,
    title: 'Episódio recebido da API',
    description: 'Descrição do episódio.',
    thumbnailUrl: 'https://cdn.example.test/episodes/1.jpg',
    durationSeconds: 542,
    accessLevel: 'FREE',
    publishedAt: '2026-11-16T12:00:00.000Z',
    ...overrides,
  };
}

test('catalog API accepts empty public category and series results', async () => {
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000/',
    fetchImpl: async (url) => {
      if (url.includes('/categories?')) return Response.json(envelope(emptyPage(50)));
      return Response.json(envelope(emptyPage(12)));
    },
  });

  assert.deepEqual(await api.listCategories(), emptyPage(50));
  assert.deepEqual(await api.listSeries(), emptyPage(12));
});

test('catalog API validates and returns real series and categories from the shared schemas', async () => {
  const expectedCategory = { id: 'category-1', slug: 'drama', name: 'Drama' };
  const expectedSeries = series({ categories: [expectedCategory] });
  const calls = [];
  const api = createCatalogApi({
    baseURL: 'http://192.168.1.8:3000',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return url.includes('/categories?')
        ? Response.json(envelope({ items: [expectedCategory], pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }))
        : Response.json(envelope({ items: [expectedSeries], pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }));
    },
  });

  assert.deepEqual((await api.listCategories()).items, [expectedCategory]);
  assert.deepEqual((await api.listSeries({ category: 'drama', search: '  teste  ', page: 2, pageSize: 20 })).items, [expectedSeries]);
  const seriesCall = calls.find(({ url }) => url.includes('/series?'));
  const params = new URL(seriesCall.url).searchParams;
  assert.equal(params.get('category'), 'drama');
  assert.equal(params.get('search'), 'teste');
  assert.equal(params.get('sort'), 'featured');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('pageSize'), '20');
  assert.equal(seriesCall.init.credentials, 'omit');
});

test('catalog API reads complete public series details, seasons, and FREE and PREMIUM episodes', async () => {
  const detail = seriesDetail({
    ageRating: '12+',
    categories: [{ id: 'category-1', slug: 'drama', name: 'Drama' }],
  });
  const seasons = [{ id: 'season-1', seasonNumber: 1, title: 'Primeiros passos' }];
  const episodes = [
    episode({ episodeNumber: 1, accessLevel: 'FREE' }),
    episode({ id: 'episode-2', episodeNumber: 2, title: 'A continuação', accessLevel: 'PREMIUM', thumbnailUrl: null }),
  ];
  const calls = [];
  const api = createCatalogApi({
    baseURL: 'https://api.example.test/',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.includes('/seasons/1/episodes?')) return Response.json(envelope(paginated(episodes, 20)));
      if (url.includes('/seasons?')) return Response.json(envelope(paginated(seasons, 100)));
      return Response.json(envelope(detail));
    },
  });

  assert.deepEqual(await api.getSeries('drama-series'), detail);
  assert.deepEqual((await api.listSeasons('drama-series')).items, seasons);
  assert.deepEqual((await api.listEpisodes('drama-series', 1)).items, episodes);

  assert.match(calls[0].url, /\/api\/catalog\/series\/drama-series$/);
  assert.match(calls[1].url, /\/api\/catalog\/series\/drama-series\/seasons\?page=1&pageSize=100$/);
  assert.match(calls[2].url, /\/api\/catalog\/series\/drama-series\/seasons\/1\/episodes\?page=1&pageSize=20$/);
  assert.ok(calls.every(({ init }) => init.credentials === 'omit'));
  assert.deepEqual((await api.listEpisodes('drama-series', 1)).items.map(({ accessLevel }) => accessLevel), ['FREE', 'PREMIUM']);
});

test('catalog API accepts a public series without images and optional description or rating', async () => {
  const detail = seriesDetail({
    description: null,
    featuredImageUrl: null,
    posterUrl: null,
    ageRating: null,
  });
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000',
    fetchImpl: async () => Response.json(envelope(detail)),
  });

  assert.equal((await api.getSeries('no-art-series')).featuredImageUrl, null);
  assert.equal((await api.getSeries('no-art-series')).description, null);
  assert.equal((await api.getSeries('no-art-series')).ageRating, null);
});

test('strict public schemas reject private media fields on series and episodes', async () => {
  const invalidPayloads = [
    envelope(seriesDetail({ storageKey: 'private/series/asset' })),
    envelope(paginated([episode({ videoUrl: 'https://private.example.test/stream.m3u8' })])),
  ];
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000',
    fetchImpl: async (url) => Response.json(invalidPayloads[url.includes('/episodes?') ? 1 : 0]),
  });

  await assert.rejects(api.getSeries('private-fields'), (error) => error.code === 'INVALID_RESPONSE');
  await assert.rejects(api.listEpisodes('private-fields', 1), (error) => error.code === 'INVALID_RESPONSE');
});

test('series and season 404 responses are distinguishable without exposing server details', async () => {
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000',
    fetchImpl: async () => Response.json({ error: 'private database trace' }, { status: 404 }),
  });

  await assert.rejects(api.getSeries('missing'), (error) => {
    assert.ok(error instanceof CatalogApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, 'HTTP_ERROR');
    assert.doesNotMatch(error.message, /private database trace/);
    return true;
  });
});

test('catalog API maps connection failures to a safe user-facing error', async () => {
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000',
    fetchImpl: async () => { throw new Error('internal connection detail'); },
  });

  await assert.rejects(api.listSeries(), (error) => {
    assert.ok(error instanceof CatalogApiError);
    assert.equal(error.code, 'CONNECTION_ERROR');
    assert.doesNotMatch(error.message, /internal connection detail/);
    return true;
  });
});

test('catalog API rejects invalid envelopes and internal fields from public data', async () => {
  const invalidResponses = [
    Response.json({ success: true, data: { items: [], pagination: {} } }),
    Response.json(envelope({ items: [series({ storageKey: 'private/storage/key' })], pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } })),
    new Response('not-json', { status: 200 }),
  ];

  for (const response of invalidResponses) {
    const api = createCatalogApi({ baseURL: 'http://localhost:3000', fetchImpl: async () => response });
    await assert.rejects(api.listSeries(), (error) => {
      assert.equal(error.code, 'INVALID_RESPONSE');
      return true;
    });
  }
});

test('catalog API reports HTTP failures without exposing server details', async () => {
  const api = createCatalogApi({
    baseURL: 'http://localhost:3000',
    fetchImpl: async () => Response.json({ error: 'private server trace' }, { status: 500 }),
  });

  await assert.rejects(api.listSeries(), (error) => {
    assert.equal(error.code, 'HTTP_ERROR');
    assert.doesNotMatch(error.message, /private server trace/);
    return true;
  });
});

test('API URL resolution preserves Android emulator, physical-device, and explicit URL behavior', () => {
  assert.equal(resolveApiBaseURL({ platform: 'android', isPhysicalDevice: false }), 'http://10.0.2.2:3000');
  assert.equal(resolveApiBaseURL({ platform: 'android', isPhysicalDevice: true, expoHost: '192.168.1.8' }), 'http://192.168.1.8:3000');
  assert.equal(resolveApiBaseURL({ platform: 'ios', isPhysicalDevice: false }), 'http://localhost:3000');
  assert.equal(resolveApiBaseURL({ platform: 'ios', isPhysicalDevice: true, configuredURL: ' https://api.mindplus.example/ ' }), 'https://api.mindplus.example');
});

test('public catalog routes do not depend on Better Auth while the account route retains its session guard', async () => {
  const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');
  const [rootLayout, home, seriesList, seriesDetail, seasonEpisodes, privateLayout, privateHome] = await Promise.all([
    read('../src/app/_layout.tsx'),
    read('../src/app/index.tsx'),
    read('../src/app/series/index.tsx'),
    read('../src/app/series/[slug]/index.tsx'),
    read('../src/app/series/[slug]/seasons/[seasonNumber].tsx'),
    read('../src/app/(app)/_layout.tsx'),
    read('../src/app/(app)/home.tsx'),
  ]);

  assert.doesNotMatch(rootLayout, /authClient|useSession/);
  assert.doesNotMatch(home, /authClient|useSession/);
  assert.doesNotMatch(seriesList, /authClient|useSession/);
  assert.doesNotMatch(seriesDetail, /authClient|useSession/);
  assert.doesNotMatch(seasonEpisodes, /authClient|useSession/);
  assert.match(home, /useCatalogData/);
  assert.match(rootLayout, /Stack\.Screen name="index"/);
  assert.match(seriesDetail, /useCatalogSeriesDetail/);
  assert.match(seasonEpisodes, /useCatalogSeasonEpisodes/);
  assert.match(privateLayout, /authClient\.useSession\(\)/);
  assert.match(privateLayout, /Stack\.Protected guard=\{Boolean\(session\)\}/);
  assert.match(privateHome, /authFlow\.logout/);
  assert.match(privateHome, /Explorar catálogo público/);
});
