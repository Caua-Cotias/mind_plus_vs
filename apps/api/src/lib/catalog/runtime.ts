import "@/lib/load-env.ts";
import { prisma } from "@/lib/database";

import { createCatalogHandlers } from "./catalog-http.ts";
import { createCatalogService } from "./catalog-service.ts";

export const catalogHandlers = createCatalogHandlers(createCatalogService(prisma));
