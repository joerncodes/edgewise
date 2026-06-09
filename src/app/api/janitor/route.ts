import { getStorage } from "@/lib/storage";
import { computeJanitor } from "@/lib/janitor";
import { json, serverError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const staleParam = url.searchParams.get("staleAfterDays");
    const staleAfterDays = staleParam ? Math.max(1, Number(staleParam) || 365) : 365;

    const storage = getStorage();
    const [knives, owners] = await Promise.all([
      storage.listKnives(),
      storage.listOwners(),
    ]);
    return json(computeJanitor(knives, owners, new Date(), staleAfterDays));
  } catch (err) {
    return serverError(err);
  }
}
