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

interface DemoUserConfig {
  email: string;
  fullName: string;
  roleDescription: string;
  companyRole?: "admin" | "member";
  employeeId?: string;
  department?: string;
  designation?: string;
}

const DEMO_USERS: DemoUserConfig[] = [
  {
    email: "arjun.kapoor@tripmate.io",
    fullName: "Arjun Kapoor",
    roleDescription: "Corporate Admin",
    companyRole: "admin",
    employeeId: "EMP-001",
    department: "Executive",
    designation: "Managing Director",
  },
  {
    email: "member@tripmate.io",
    fullName: "Priya Sharma",
    roleDescription: "Corporate Member",
    companyRole: "member",
    employeeId: "EMP-002",
    department: "Operations",
    designation: "Operations Manager",
  },
  {
    email: "nonmember@tripmate.io",
    fullName: "Rohan Mehta",
    roleDescription: "Non-member",
  },
];

const ACME_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoPassword = process.env.DEMO_USER_PASSWORD;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }

  if (!demoPassword) {
    throw new Error("Missing DEMO_USER_PASSWORD in .env.local.");
  }

  // Use service-role client for Admin API & company membership operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Seeding demo company and users via Supabase Admin API...");

  // Verify seeded demo company exists to attach memberships to that exact ID (no second company)
  const { data: companyRow, error: companyError } = await adminClient
    .from("companies")
    .select("id, name")
    .eq("id", ACME_COMPANY_ID)
    .single();

  if (companyError || !companyRow) {
    throw new Error(
      `Demo company (${ACME_COMPANY_ID}) from seed.sql not found: ${companyError?.message}`
    );
  }

  console.log(`Using demo company: ${companyRow.name} (${companyRow.id})`);

  // Fetch existing users to ensure idempotence
  const { data: userListData, error: listError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existingUsersByEmail = new Map(
    userListData.users.map((u) => [u.email?.toLowerCase(), u])
  );

  for (const config of DEMO_USERS) {
    const existing = existingUsersByEmail.get(config.email.toLowerCase());
    let userId = existing?.id;

    if (!existing) {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: config.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: config.fullName,
          name: config.fullName,
        },
      });

      if (createError) {
        throw new Error(`Failed to create user ${config.email}: ${createError.message}`);
      }

      userId = created.user.id;
    } else {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: config.fullName,
          name: config.fullName,
        },
      });

      if (updateError) {
        throw new Error(`Failed to update user ${config.email}: ${updateError.message}`);
      }
    }

    if (!userId) {
      throw new Error(`Could not determine user ID for ${config.email}`);
    }

    // Ensure profile row exists
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        full_name: config.fullName,
        email: config.email,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${config.email}: ${profileError.message}`);
    }

    // Insert company membership if applicable
    if (config.companyRole) {
      const { error: memberError } = await adminClient.from("company_members").upsert(
        {
          company_id: ACME_COMPANY_ID,
          profile_id: userId,
          role: config.companyRole,
          employee_id: config.employeeId ?? null,
          department: config.department ?? null,
          designation: config.designation ?? null,
        },
        { onConflict: "company_id,profile_id" }
      );

      if (memberError) {
        throw new Error(
          `Failed to upsert company membership for ${config.email}: ${memberError.message}`
        );
      }
    }
  }

  console.log("Successfully seeded demo users:");
  for (const config of DEMO_USERS) {
    console.log(` - ${config.email} (${config.roleDescription})`);
  }
}

main().catch((err) => {
  console.error("Fatal error running seed-demo-users:", err.message || err);
  process.exit(1);
});
