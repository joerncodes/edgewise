import { renderApiDocs } from "@/lib/api-docs";

export async function GET() {
  return new Response(renderApiDocs(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
