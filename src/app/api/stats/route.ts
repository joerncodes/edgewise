import { getStorage } from "@/lib/storage";
import { computeStats } from "@/lib/stats";
import { json, serverError } from "@/lib/http";

export async function GET() {
  try {
    const storage = getStorage();
    const [knives, owners] = await Promise.all([
      storage.listKnives(),
      storage.listOwners(),
    ]);
    return json(computeStats(knives, owners));
  } catch (err) {
    return serverError(err);
  }
}
