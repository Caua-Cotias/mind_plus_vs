import { apiBaseURL } from './api-origin';
import { createCatalogApi } from './catalog-client';

export const catalogApi = createCatalogApi({ baseURL: apiBaseURL });
