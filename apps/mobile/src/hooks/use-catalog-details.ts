import { useEffect, useState } from 'react';

import { CatalogApiError, type CatalogPage } from '@/lib/catalog-client';
import { catalogApi } from '@/lib/catalog-api';
import type { CatalogEpisode, CatalogSeason, CatalogSeriesDetail } from '@mind-plus/contracts';

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'success'; data: T };

function isNotFound(error: unknown): error is CatalogApiError {
  return error instanceof CatalogApiError && error.status === 404;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível carregar o catálogo. Tente novamente.';
}

export function useCatalogSeriesDetail(slug: string | undefined) {
  const [result, setResult] = useState<{
    requestKey: string;
    state: ResourceState<{ series: CatalogSeriesDetail; seasons: CatalogSeason[] }>;
  }>({ requestKey: '', state: { status: 'loading' } });
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = JSON.stringify([slug, retryCount]);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    void Promise.all([
      catalogApi.getSeries(slug, controller.signal),
      catalogApi.listSeasons(slug, { page: 1, pageSize: 100 }, controller.signal),
    ])
      .then(([series, seasons]) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: { status: 'success', data: { series, seasons: seasons.items } },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        controller.abort();
        setResult({
          requestKey,
          state: isNotFound(error)
            ? { status: 'not-found' }
            : { status: 'error', message: errorMessage(error) },
        });
      });

    return () => controller.abort();
  }, [requestKey, slug]);

  return {
    state: !slug
      ? { status: 'not-found' as const }
      : result.requestKey === requestKey
        ? result.state
        : { status: 'loading' as const },
    retry: () => setRetryCount((count) => count + 1),
  };
}

export function useCatalogSeasonEpisodes(
  slug: string | undefined,
  seasonNumber: number | undefined,
  page: number,
  pageSize = 20,
) {
  const [result, setResult] = useState<{
    requestKey: string;
    state: ResourceState<CatalogPage<CatalogEpisode>>;
  }>({ requestKey: '', state: { status: 'loading' } });
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = JSON.stringify([slug, seasonNumber, page, pageSize, retryCount]);
  const validRoute = Boolean(slug && Number.isSafeInteger(seasonNumber) && seasonNumber && seasonNumber > 0);

  useEffect(() => {
    if (!validRoute || !slug || !seasonNumber) return;

    const controller = new AbortController();

    void catalogApi.listEpisodes(
      slug,
      seasonNumber,
      { page, pageSize },
      controller.signal,
    )
      .then((episodes) => {
        if (controller.signal.aborted) return;
        setResult({ requestKey, state: { status: 'success', data: episodes } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: isNotFound(error)
            ? { status: 'not-found' }
            : { status: 'error', message: errorMessage(error) },
        });
      });

    return () => controller.abort();
  }, [page, pageSize, requestKey, seasonNumber, slug, validRoute]);

  return {
    state: !validRoute
      ? { status: 'not-found' as const }
      : result.requestKey === requestKey
        ? result.state
        : { status: 'loading' as const },
    retry: () => setRetryCount((count) => count + 1),
  };
}
