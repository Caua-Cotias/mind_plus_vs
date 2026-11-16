import { catalogHandlers } from "@/lib/catalog/runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return catalogHandlers.seriesDetail(request, context);
}
