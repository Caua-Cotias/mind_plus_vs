import {
  apiErrorResponseSchema,
  catalogCategoryListResponseSchema,
  catalogEpisodeListResponseSchema,
  catalogEpisodeQuerySchema,
  catalogSeasonListResponseSchema,
  catalogSeriesDetailResponseSchema,
  catalogSeriesListResponseSchema,
  catalogSeriesQuerySchema,
  catalogSlugSchema,
  paginationParamsSchema,
} from "@mind-plus/contracts";
import { z } from "zod";

import {
  CatalogNotFoundError,
  CatalogPaginationRangeError,
  type CatalogReadService,
} from "./catalog-service.ts";

const seasonNumberSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));

type RouteContext<TParams extends object> = {
  params: Promise<TParams>;
};

function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const body = apiErrorResponseSchema.parse({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });

  return Response.json(body, { status });
}

function invalidInput(error: z.ZodError): Response {
  return apiError(400, "INVALID_REQUEST", "Os parâmetros da consulta são inválidos.", {
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  });
}

function queryRecord(request: Request): Record<string, string> | z.ZodError {
  const entries = [...new URL(request.url).searchParams.entries()];
  const keys = entries.map(([key]) => key);

  if (new Set(keys).size !== keys.length) {
    return new z.ZodError([{
      code: "custom",
      path: [],
      message: "Cada parâmetro de consulta deve aparecer no máximo uma vez.",
    }]);
  }

  return Object.fromEntries(entries);
}

function parseQuery<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): { data: z.output<TSchema> } | { response: Response } {
  const record = queryRecord(request);
  if (record instanceof z.ZodError) return { response: invalidInput(record) };

  const result = schema.safeParse(record);
  if (!result.success) return { response: invalidInput(result.error) };

  return { data: result.data };
}

function parseSlug(slug: string): { data: string } | { response: Response } {
  const result = catalogSlugSchema.safeParse(slug);
  if (!result.success) return { response: invalidInput(result.error) };
  return { data: result.data };
}

function execute<TData>(
  operation: () => Promise<TData>,
  responseSchema: z.ZodType,
): Promise<Response> {
  return operation()
    .then((data) => Response.json(responseSchema.parse({ success: true, data })))
    .catch((error: unknown) => {
      if (error instanceof CatalogNotFoundError) {
        return apiError(404, "CATALOG_NOT_FOUND", "O conteúdo solicitado não foi encontrado.");
      }

      if (error instanceof CatalogPaginationRangeError) {
        return apiError(400, "INVALID_REQUEST", "A página solicitada está fora do limite suportado.");
      }

      return apiError(500, "INTERNAL_SERVER_ERROR", "Não foi possível consultar o catálogo.");
    });
}

export function createCatalogHandlers(service: CatalogReadService) {
  return {
    categories(request: Request): Promise<Response> {
      const parsed = parseQuery(request, paginationParamsSchema.strict());
      if ("response" in parsed) return Promise.resolve(parsed.response);

      return execute(
        () => service.listCategories(parsed.data),
        catalogCategoryListResponseSchema,
      );
    },

    series(request: Request): Promise<Response> {
      const parsed = parseQuery(request, catalogSeriesQuerySchema);
      if ("response" in parsed) return Promise.resolve(parsed.response);

      return execute(
        () => service.listSeries(parsed.data),
        catalogSeriesListResponseSchema,
      );
    },

    async seriesDetail(
      _request: Request,
      context: RouteContext<{ slug: string }>,
    ): Promise<Response> {
      const { slug } = await context.params;
      const parsed = parseSlug(slug);
      if ("response" in parsed) return parsed.response;

      return execute(
        () => service.getSeriesBySlug(parsed.data),
        catalogSeriesDetailResponseSchema,
      );
    },

    async seasons(
      request: Request,
      context: RouteContext<{ slug: string }>,
    ): Promise<Response> {
      const parsedQuery = parseQuery(request, paginationParamsSchema.strict());
      if ("response" in parsedQuery) return parsedQuery.response;

      const { slug } = await context.params;
      const parsedSlug = parseSlug(slug);
      if ("response" in parsedSlug) return parsedSlug.response;

      return execute(
        () => service.listSeasons(parsedSlug.data, parsedQuery.data),
        catalogSeasonListResponseSchema,
      );
    },

    async episodes(
      request: Request,
      context: RouteContext<{ slug: string; seasonNumber: string }>,
    ): Promise<Response> {
      const parsedQuery = parseQuery(request, catalogEpisodeQuerySchema);
      if ("response" in parsedQuery) return parsedQuery.response;

      const { slug, seasonNumber } = await context.params;
      const parsedSlug = parseSlug(slug);
      if ("response" in parsedSlug) return parsedSlug.response;

      const parsedSeason = seasonNumberSchema.safeParse(seasonNumber);
      if (!parsedSeason.success) return invalidInput(parsedSeason.error);

      return execute(
        () => service.listEpisodes(parsedSlug.data, parsedSeason.data, parsedQuery.data),
        catalogEpisodeListResponseSchema,
      );
    },
  };
}
