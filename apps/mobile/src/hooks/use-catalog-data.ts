import { useEffect, useState } from 'react';

import { catalogApi } from '@/lib/catalog-api';
import type { CatalogPage, CatalogSeriesQuery } from '@/lib/catalog-client';
import type { CatalogCategory, CatalogSeriesSummary } from '@mind-plus/contracts';

export type CatalogDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      categories: CatalogCategory[];
      series: CatalogPage<CatalogSeriesSummary>;
    };

export function useCatalogData({
  category,
  search,
  includeCategories = false,
  page = 1,
  pageSize = 12,
}: {
  category?: string;
  search?: string;
  includeCategories?: boolean;
  page?: number;
  pageSize?: number;
} = {}) {
  const [result, setResult] = useState<{ requestKey: string; state: CatalogDataState }>({
    requestKey: '',
    state: { status: 'loading' },
  });
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = JSON.stringify([category, search, includeCategories, page, pageSize, retryCount]);

  useEffect(() => {
    const controller = new AbortController();

    const query: CatalogSeriesQuery = {
      page,
      pageSize,
      sort: 'featured',
      ...(category ? { category } : {}),
      ...(search?.trim() ? { search: search.trim() } : {}),
    };

    const categoriesRequest = includeCategories
      ? catalogApi.listCategories(controller.signal)
      : Promise.resolve({ items: [], pagination: emptyPagination });

    void Promise.all([categoriesRequest, catalogApi.listSeries(query, controller.signal)])
      .then(([categoryPage, series]) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: { status: 'success', categories: categoryPage.items, series },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: {
            status: 'error',
            message: error instanceof Error
              ? error.message
              : 'Não foi possível carregar o catálogo. Tente novamente.',
          },
        });
      });

    return () => controller.abort();
  }, [category, includeCategories, page, pageSize, requestKey, retryCount, search]);

  return {
    state: result.requestKey === requestKey ? result.state : { status: 'loading' as const },
    retry: () => setRetryCount((count) => count + 1),
  };
}

const emptyPagination: CatalogPage<never>['pagination'] = {
  page: 1,
  pageSize: 1,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};
