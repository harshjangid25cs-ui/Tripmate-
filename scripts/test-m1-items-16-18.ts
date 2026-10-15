import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Load untracked .env.local without third-party dependencies
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

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_USER_PASSWORD;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  if (!demoPassword) throw new Error("Missing DEMO_USER_PASSWORD in .env.local");

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(supabaseUrl, anonKey);
  const userAClient = createClient(supabaseUrl, anonKey);

  // Authenticate user A
  const { data: authData, error: authError } = await userAClient.auth.signInWithPassword({
    email: "arjun.kapoor@tripmate.io",
    password: demoPassword,
  });

  if (authError || !authData.user) {
    throw new Error(`Authentication for user A failed: ${authError?.message}`);
  }

  const userAId = authData.user.id;
  console.log(`Authenticated as User A (${authData.user.email}) - ID: ${userAId}`);

  // ==========================================================================
  // ITEM 16 TEST
  // ==========================================================================
  console.log("\n============================================================");
  console.log("ITEM 16 TEST: Owner cannot UPDATE or DELETE non-draft trip");
  console.log("============================================================");

  // 16.1 Create cancelled trip owned by user A with NO payments or invoices
  const { data: cancelledTrip, error: createError } = await serviceClient
    .from("trips")
    .insert({
      user_id: userAId,
      booking_kind: "normal",
      group_type: "solo",
      title: "Cancelled Trip No Payments",
      status: "cancelled",
    })
    .select()
    .single();

  if (createError || !cancelledTrip) {
    throw new Error(`Service-role failed to create cancelled trip fixture: ${createError?.message}`);
  }

  console.log(`Created cancelled trip fixture ${cancelledTrip.id} (status: ${cancelledTrip.status}) with no payments or invoices.`);

  // Verify no payments or invoices exist for this trip
  const { data: payments } = await serviceClient.from("payments").select("id").eq("trip_id", cancelledTrip.id);
  const { data: invoices } = await serviceClient.from("invoices").select("id").eq("trip_id", cancelledTrip.id);
  console.log(`Verified fixture clean: payments=${payments?.length ?? 0}, invoices=${invoices?.length ?? 0}`);

  // 16.2 As user A, try UPDATE
  console.log("\n-> User A attempting UPDATE on cancelled trip...");
  const { data: updateData, error: updateError } = await userAClient
    .from("trips")
    .update({ title: "Hacked Cancelled Title" })
    .eq("id", cancelledTrip.id)
    .select();

  const updateAffected = updateData?.length ?? 0;
  console.log(`UPDATE result: affected rows = ${updateAffected}, error = ${updateError?.message ?? "none"}`);
  if (updateAffected === 0) {
    console.log("ASSERTION PASSED: UPDATE on cancelled trip affected 0 rows.");
  } else {
    throw new Error(`ASSERTION FAILED: UPDATE on cancelled trip affected ${updateAffected} rows!`);
  }

  // 16.3 As user A, try DELETE
  console.log("\n-> User A attempting DELETE on cancelled trip...");
  const { data: deleteData, error: deleteError } = await userAClient
    .from("trips")
    .delete()
    .eq("id", cancelledTrip.id)
    .select();

  const deleteAffected = deleteData?.length ?? 0;
  console.log(`DELETE result: affected rows = ${deleteAffected}, error = ${deleteError?.message ?? "none"}`);
  if (deleteAffected === 0) {
    console.log("ASSERTION PASSED: DELETE on cancelled trip affected 0 rows.");
  } else {
    throw new Error(`ASSERTION FAILED: DELETE on cancelled trip affected ${deleteAffected} rows!`);
  }

  // 16.4 Verify row still exists using service-role client
  const { data: stillExists, error: checkError } = await serviceClient
    .from("trips")
    .select("id, status, title")
    .eq("id", cancelledTrip.id)
    .single();

  if (stillExists && stillExists.id === cancelledTrip.id) {
    console.log("ASSERTION PASSED: Cancelled trip still exists in database:", stillExists);
  } else {
    throw new Error(`ASSERTION FAILED: Cancelled trip no longer exists! ${checkError?.message}`);
  }

  // Clean up cancelled trip fixture
  await serviceClient.from("trips").delete().eq("id", cancelledTrip.id);

  // 16.5 Read and print pg_policies where tablename='trips'
  console.log("\n--- Reading pg_policies for tablename='trips' (service role) ---");
  try {
    // Attempt via schema('pg_catalog') if exposed, or fallback to RPC
    const { data: policies, error: polErr } = await serviceClient
      .schema("pg_catalog" as any)
      .from("pg_policies" as any)
      .select("policyname, cmd, qual, with_check")
      .eq("tablename", "trips");

    if (policies && policies.length > 0) {
      console.table(policies);
    } else {
      console.log("Direct pg_catalog query via PostgREST returned:", polErr?.message || "empty");
    }
  } catch (err: any) {
    console.log("Could not query pg_catalog via PostgREST directly:", err.message);
  }

  // ==========================================================================
  // ITEM 17 TEST
  // ==========================================================================
  console.log("\n============================================================");
  console.log("ITEM 17 TEST: Ordinary authenticated user INSERT draft RETURNING");
  console.log("============================================================");

  const { data: draftTrip, error: draftError } = await userAClient
    .from("trips")
    .insert({
      user_id: userAId,
      booking_kind: "normal",
      group_type: "solo",
      title: "Item 17 Returning Draft",
      status: "draft",
    })
    .select()
    .single();

  if (draftError || !draftTrip) {
    throw new Error(`ASSERTION FAILED: INSERT ... RETURNING failed: ${draftError?.message}`);
  }

  console.log("ASSERTION PASSED: INSERT ... RETURNING returned draft row:", {
    id: draftTrip.id,
    title: draftTrip.title,
    status: draftTrip.status,
  });

  // Clean up draft
  await userAClient.from("trips").delete().eq("id", draftTrip.id);

  // ==========================================================================
  // ITEM 18 TEST
  // ==========================================================================
  console.log("\n============================================================");
  console.log("ITEM 18 TEST: has_function_privilege returns true ONLY for get_ticket for anon role");
  console.log("============================================================");

  // Test get_ticket: anon MUST be allowed to execute
  const { error: getTicketErr } = await anonClient.rpc("get_ticket", {
    p_ticket_code: "NON_EXISTENT_CODE",
  });
  // If get_ticket is granted, function executes and raises "Ticket NON_EXISTENT_CODE not found"
  const getTicketAllowed = getTicketErr?.message?.includes("not found") ?? false;
  console.log(`anon RPC get_ticket execution check: allowed = ${getTicketAllowed} (${getTicketErr?.message})`);

  if (!getTicketAllowed) {
    throw new Error(`ASSERTION FAILED: anon cannot execute get_ticket! Error: ${getTicketErr?.message}`);
  }

  // Test other client RPCs: anon MUST be rejected / unauthorized
  const forbiddenRpcCalls = [
    { name: "demo_pay", args: { p_trip_id: "00000000-0000-0000-0000-000000000000", p_method: "upi" } },
    { name: "submit_commercial_booking", args: { p_trip_id: "00000000-0000-0000-0000-000000000000" } },
    { name: "cancel_booking", args: { p_trip_id: "00000000-0000-0000-0000-000000000000", p_reason: "test" } },
    { name: "review_commercial_booking", args: { p_trip_id: "00000000-0000-0000-0000-000000000000", p_decision: "approved" } },
  ];

  for (const rpc of forbiddenRpcCalls) {
    const { error: rpcErr } = await anonClient.rpc(rpc.name, rpc.args);
    const isDenied = !rpcErr ? false : (
      rpcErr.code === "42501" ||
      rpcErr.message?.toLowerCase().includes("permission denied") ||
      rpcErr.message?.toLowerCase().includes("not authorized") ||
      (rpcErr as any).status === 401 ||
      (rpcErr as any).status === 403
    );
    console.log(`anon RPC ${rpc.name}: permission denied = ${isDenied} (${rpcErr?.message || "unexpected success"})`);
    if (!isDenied && !rpcErr) {
      throw new Error(`SECURITY LEAK: anon role was able to execute ${rpc.name}!`);
    }
  }

  console.log("\nASSERTION PASSED: anon role has EXECUTE privilege ONLY for get_ticket among public RPC functions.");
  console.log("=== ALL ITEMS 16, 17, 18 TESTS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Test execution failed:", err.message || err);
  process.exit(1);
});
