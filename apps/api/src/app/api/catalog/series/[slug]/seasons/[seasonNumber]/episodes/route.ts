import { catalogHandlers } from "@/lib/catalog/runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; seasonNumber: string }> },
) {
  return catalogHandlers.episodes(request, context);
}
