import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Fetching test profile IDs...");
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", [
      "arjun.kapoor@tripmate.io",
      "member@tripmate.io",
      "nonmember@tripmate.io",
    ]);

  if (pErr || !profiles) {
    console.error("Failed to fetch profiles:", pErr);
    process.exit(1);
  }

  const userIds = profiles.map((p) => p.id);
  console.log(`Found ${userIds.length} test user profiles:`, profiles.map((p) => p.email));

  const { data: testTrips, error: tErr } = await admin
    .from("trips")
    .select("id, booking_ref")
    .in("user_id", userIds);

  if (tErr) {
    console.error("Failed to fetch test trips:", tErr);
    process.exit(1);
  }

  const tripIds = (testTrips || []).map((t) => t.id);
  console.log(`Found ${tripIds.length} test trips to clean up.`);

  if (tripIds.length === 0) {
    console.log("No test pollution trips found. Database is clean!");
    return;
  }

  // Delete in batches to avoid URL length or parameter limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < tripIds.length; i += BATCH_SIZE) {
    const batch = tripIds.slice(i, i + BATCH_SIZE);
    console.log(`Cleaning batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} trips)...`);

    // 1. Delete payments
    const { error: payErr } = await admin.from("payments").delete().in("trip_id", batch);
    if (payErr) console.warn("Payment delete warning:", payErr.message);

    // 2. Delete invoices
    const { error: invErr } = await admin.from("invoices").delete().in("trip_id", batch);
    if (invErr) console.warn("Invoice delete warning:", invErr.message);

    // 3. Delete trips (cascades trip_passengers, trip_stops, trip_hotels, trip_vehicles, commercial_bookings)
    const { error: tripErr } = await admin.from("trips").delete().in("id", batch);
    if (tripErr) {
      console.error("Trip delete error:", tripErr.message);
    }
  }

  console.log("✅ Successfully cleaned up all test pollution trips from Supabase!");
}

main().catch((err) => {
  console.error("Fatal cleanup error:", err);
  process.exit(1);
});
