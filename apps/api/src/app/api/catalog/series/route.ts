import { catalogHandlers } from "@/lib/catalog/runtime";

export async function GET(request: Request) {
  return catalogHandlers.series(request);
}
