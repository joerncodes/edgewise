import { getStorage } from "@/lib/storage";
import { computeFacets } from "@/lib/facets";
import { json, serverError } from "@/lib/http";

export async function GET() {
  try {
    const knives = await getStorage().listKnives();
    return json(computeFacets(knives));
  } catch (err) {
    return serverError(err);
  }
}
