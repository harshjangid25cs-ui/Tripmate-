"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidIndianPhone } from "@/lib/data/profile-types";
import {
  updateUserProfileSchema,
  markNotificationReadSchema,
} from "@/lib/validations/actions";

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
  data?: {
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
  };
}

export async function updateUserProfileAction(payload: {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<UpdateProfileResult> {
  try {
    const parsed = updateUserProfileSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile update payload." };
    }

    const trimmedName = payload.fullName.trim();
    let cleanedPhone: string | null = null;
    if (payload.phone && payload.phone.trim().length > 0) {
      const trimmedPhone = payload.phone.trim();
      if (!isValidIndianPhone(trimmedPhone)) {
        return {
          ok: false,
          error: "Please enter a valid 10-digit Indian mobile number (e.g. 9810123456 or +91 98101 23456).",
        };
      }
      cleanedPhone = trimmedPhone;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // In demo mode without session, allow local state preview
      return {
        ok: true,
        data: {
          fullName: trimmedName,
          phone: cleanedPhone,
          avatarUrl: payload.avatarUrl || null,
        },
      };
    }

    // Strictly update only allowed columns per DATABASE.md §1 & §5 column grants
    // profiles UPDATE: full_name, phone, avatar_url
    const updatePayload: {
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
    } = {
      full_name: trimmedName,
      phone: cleanedPhone,
      avatar_url: payload.avatarUrl || null,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (error) {
      console.error("Database error updating profile:", error);
      // Still return graceful status for UI responsiveness if demo user
      return { ok: false, error: error.message };
    }

    revalidatePath("/profile");
    return {
      ok: true,
      data: {
        fullName: trimmedName,
        phone: cleanedPhone,
        avatarUrl: payload.avatarUrl || null,
      },
    };
  } catch (err) {
    console.error("Unexpected error updating profile:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = markNotificationReadSchema.safeParse({ notificationId });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notification ID." };
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: true };
    }

    // notifications UPDATE: is_read only
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("profile_id", user.id);

    if (error) {
      console.error("Error marking notification read:", error);
      return { ok: false, error: error.message };
    }

    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to mark read.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: true };
    }

    // notifications UPDATE: is_read only
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications read:", error);
      return { ok: false, error: error.message };
    }

    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to mark all read.",
    };
  }
}
