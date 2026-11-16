import {
  catalogCategoryListResponseSchema,
  catalogEpisodeListResponseSchema,
  catalogSeasonListResponseSchema,
  catalogSeriesDetailResponseSchema,
  catalogSeriesListResponseSchema,
  type CatalogCategory,
  type CatalogEpisode,
  type CatalogSeason,
  type CatalogSeriesDetail,
  type CatalogSeriesSummary,
  type CatalogSeriesSort,
} from '@mind-plus/contracts';
import { z } from 'zod';

export type CatalogSeriesQuery = {
  category?: string;
  search?: string;
  sort?: CatalogSeriesSort;
  page?: number;
  pageSize?: number;
};

export type CatalogPage<TItem> = {
  items: TItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type CatalogErrorCode = 'CONNECTION_ERROR' | 'HTTP_ERROR' | 'INVALID_RESPONSE';

export class CatalogApiError extends Error {
  readonly code: CatalogErrorCode;
  readonly status?: number;

  constructor(
    code: CatalogErrorCode,
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = 'CatalogApiError';
    this.code = code;
    this.status = status;
  }
}

type CatalogFetch = (input: string, init?: RequestInit) => Promise<Response>;
type ResponseData<TSchema extends z.ZodType> = z.output<TSchema> extends { data: infer TData }
  ? TData
  : never;

const ERROR_MESSAGES: Record<CatalogErrorCode, string> = {
  CONNECTION_ERROR: 'Não foi possível conectar ao catálogo. Confira sua rede e tente novamente.',
  HTTP_ERROR: 'O catálogo está indisponível agora. Tente novamente em instantes.',
  INVALID_RESPONSE: 'A resposta do catálogo não pôde ser validada.',
};

export function createCatalogApi({
  baseURL,
  fetchImpl = fetch,
}: {
  baseURL: string;
  fetchImpl?: CatalogFetch;
}) {
  const origin = baseURL.trim().replace(/\/+$/, '');

  async function request<TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    signal?: AbortSignal,
  ): Promise<ResponseData<TSchema>> {
    let response: Response;
    try {
      response = await fetchImpl(`${origin}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        signal,
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new CatalogApiError('CONNECTION_ERROR', ERROR_MESSAGES.CONNECTION_ERROR);
    }

    if (!response.ok) {
      throw new CatalogApiError('HTTP_ERROR', ERROR_MESSAGES.HTTP_ERROR, response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new CatalogApiError('INVALID_RESPONSE', ERROR_MESSAGES.INVALID_RESPONSE);
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new CatalogApiError('INVALID_RESPONSE', ERROR_MESSAGES.INVALID_RESPONSE);
    }

    return (result.data as { data: ResponseData<TSchema> }).data;
  }

  return {
    listCategories(signal?: AbortSignal): Promise<CatalogPage<CatalogCategory>> {
      return request('/api/catalog/categories?page=1&pageSize=50', catalogCategoryListResponseSchema, signal);
    },

    listSeries(
      query: CatalogSeriesQuery = {},
      signal?: AbortSignal,
    ): Promise<CatalogPage<CatalogSeriesSummary>> {
      const params = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 12),
        sort: query.sort ?? 'featured',
      });
      if (query.category) params.set('category', query.category);
      if (query.search?.trim()) params.set('search', query.search.trim());

      return request(`/api/catalog/series?${params.toString()}`, catalogSeriesListResponseSchema, signal);
    },

    getSeries(slug: string, signal?: AbortSignal): Promise<CatalogSeriesDetail> {
      return request(
        `/api/catalog/series/${encodeURIComponent(slug)}`,
        catalogSeriesDetailResponseSchema,
        signal,
      );
    },

    listSeasons(
      slug: string,
      query: { page?: number; pageSize?: number } = {},
      signal?: AbortSignal,
    ): Promise<CatalogPage<CatalogSeason>> {
      const params = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 100),
      });

      return request(
        `/api/catalog/series/${encodeURIComponent(slug)}/seasons?${params.toString()}`,
        catalogSeasonListResponseSchema,
        signal,
      );
    },

    listEpisodes(
      slug: string,
      seasonNumber: number,
      query: { page?: number; pageSize?: number } = {},
      signal?: AbortSignal,
    ): Promise<CatalogPage<CatalogEpisode>> {
      const params = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 20),
      });

      return request(
        `/api/catalog/series/${encodeURIComponent(slug)}/seasons/${seasonNumber}/episodes?${params.toString()}`,
        catalogEpisodeListResponseSchema,
        signal,
      );
    },
  };
}
