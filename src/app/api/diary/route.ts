import { getStorage } from "@/lib/storage";
import { computeDiary } from "@/lib/diary";
import { json, serverError } from "@/lib/http";

export async function GET() {
  try {
    const storage = getStorage();
    const [knives, owners] = await Promise.all([
      storage.listKnives(),
      storage.listOwners(),
    ]);
    return json(computeDiary(knives, owners));
  } catch (err) {
    return serverError(err);
  }
}
