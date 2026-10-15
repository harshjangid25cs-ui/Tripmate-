import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type SavedItemType = "destination" | "hotel" | "circuit";
type SavedItemRow = Database["public"]["Tables"]["saved_items"]["Row"];
type SavedItemInsert = Database["public"]["Tables"]["saved_items"]["Insert"];

export async function toggleSavedItem(
  itemType: SavedItemType,
  itemId: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data } = await supabase
      .from("saved_items")
      .select("id")
      .eq("profile_id", user.id)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle();

    const existing = data as { id: string } | null;

    if (existing) {
      await supabase.from("saved_items").delete().eq("id", existing.id);
      return false;
    } else {
      const insertPayload: SavedItemInsert = {
        profile_id: user.id,
        item_type: itemType,
        item_id: itemId,
      };

      await (
        supabase.from("saved_items") as unknown as {
          insert: (values: SavedItemInsert) => Promise<unknown>;
        }
      ).insert(insertPayload);

      return true;
    }
  } catch (err) {
    console.error("Failed to toggle saved item:", err);
    return false;
  }
}

export async function getSavedItemIds(
  itemType: SavedItemType
): Promise<Set<string>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return new Set();

    const { data, error } = await supabase
      .from("saved_items")
      .select("item_id")
      .eq("profile_id", user.id)
      .eq("item_type", itemType);

    if (error || !data) return new Set();

    const rows = data as unknown as SavedItemRow[];
    return new Set(rows.map((row) => row.item_id));
  } catch {
    return new Set();
  }
}
