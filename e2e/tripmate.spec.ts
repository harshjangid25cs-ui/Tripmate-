import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "e2e/screenshots");
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "";

if (!DEMO_PASSWORD) {
  throw new Error("DEMO_USER_PASSWORD environment variable is required in .env.local");
}

let userATripId = "";
// Track ALL trip IDs created across every test run to clean them up in afterAll
const createdTripIds: string[] = [];

/**
 * E2E teardown: delete all test-generated trips (and cascade-dependent records)
 * from the real Supabase database using the service-role key so no test
 * pollution accumulates across runs.
 */
async function cleanupTestTrips(tripIds: string[]): Promise<void> {
  if (tripIds.length === 0) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return; // Skip silently in CI without creds

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Delete in cascade order: payments → invoices → trip_status_history →
  // trip_passengers → trip_stops → trips
  for (const tripId of tripIds) {
    if (!tripId) continue;
    await admin.from("payments").delete().eq("trip_id", tripId);
    await admin.from("invoices").delete().eq("trip_id", tripId);
    await admin.from("trip_status_history").delete().eq("trip_id", tripId);
    await admin.from("trip_passengers").delete().eq("trip_id", tripId);
    await admin.from("trip_stops").delete().eq("trip_id", tripId);
    await admin.from("trips").delete().eq("id", tripId);
  }
}

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

// Global afterAll: clean up every trip this E2E run created
test.afterAll(async () => {
  await cleanupTestTrips(createdTripIds);
});

test.describe("TripMate End-to-End Acceptance Suite", () => {
  test("1. Normal Happy Path: Home -> Jaipur -> 4 days -> Shahpura Haveli -> Dzire -> Neemrana -> 2 travellers -> Checkout -> Confirmed -> Itinerary -> Invoice", async ({
    page,
    context,
  }) => {
    // Set onboarding cookie to bypass onboarding screens directly to login
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    // 1. Login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_login_page.png") });

    await page.locator("#email").fill("arjun.kapoor@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // 2. Home Catalog
    await page.waitForURL("**/home", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_home_catalog.png") });

    // Assert exactly the 4 seeded destinations from DB
    await expect(page.locator("text=Jaipur")).toBeVisible();
    await expect(page.locator("text=Udaipur")).toBeVisible();
    await expect(page.locator("text=Munnar")).toBeVisible();
    await expect(page.locator("text=Hampi")).toBeVisible();
    await expect(page.locator("text=Coorg")).not.toBeVisible();
    await expect(page.locator("text=Spiti")).not.toBeVisible();

    // Assert Jaipur starting price shows 12,499 from DB
    await expect(page.locator("text=12,499").first()).toBeVisible();

    // 3. Destination Detail
    const jaipurPlanBtn = page.locator('a[href="/destinations/jaipur"]').first();
    await jaipurPlanBtn.click();
    await page.waitForURL("**/destinations/jaipur", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h2:has-text('Jaipur')")).toBeVisible();
    await expect(page.locator("text=12,499").first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_destination_detail.png") });

    // Click "Plan This Trip" and select group type
    await page.locator("#planTripBtn").click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_group_chooser_modal.png") });
    await page.locator('button:has-text("Family")').click();
    await page.locator('button:has-text("Continue to Dates")').click();

    // 4. Duration step
    await page.waitForURL("**/duration", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Select 4 days
    const fourDaysBtn = page.locator('button:has-text("4 Days")').first();
    if (await fourDaysBtn.isVisible()) {
      await fourDaysBtn.click();
    }

    // Increase travelers to 2
    const addTravelerBtn = page.locator('button[aria-label="Increase traveler count"]');
    await addTravelerBtn.click();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_duration_configured.png") });

    // Click "Continue to Hotels"
    await page.locator('button:has-text("Continue to Hotels")').click();

    // 5. Hotel step
    await page.waitForURL("**/hotel", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_hotel_selection.png") });

    // Select Shahpura Haveli and ensure card is visibly selected in screenshot 07
    const haveliCard = page.locator('div.hotel-card:has-text("Shahpura Haveli")');
    await haveliCard.scrollIntoViewIfNeeded();
    const haveliBtn = haveliCard.locator('button:has-text("Select Room")');
    if ((await haveliBtn.count()) > 0) {
      await haveliBtn.click();
    }
    await expect(haveliCard.locator('button:has-text("Selected")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_hotel_selected.png") });

    // Continue to rides
    await page.locator('button:has-text("Next: Transport")').click();

    // 6. Vehicle step
    await page.waitForURL("**/vehicle", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_vehicle_selection.png") });

    // Select Maruti Suzuki Dzire and ensure card is visibly selected in screenshot 09
    const dzireCard = page.locator('div.bg-card-surface:has(h3:has-text("Dzire"))');
    await dzireCard.scrollIntoViewIfNeeded();
    const dzireApplyBtn = dzireCard.locator('button:has-text("Apply Ride")');
    if ((await dzireApplyBtn.count()) > 0) {
      await dzireApplyBtn.click();
    }
    await expect(dzireCard.locator("text=Applied")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_vehicle_selected.png") });

    // Continue to rest stops
    await page.locator('button:has-text("Continue")').click();

    // 7. Stops step
    await page.waitForURL("**/stops", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_stops_selection.png") });

    // Add Neemrana Fort-Palace
    const neemranaArticle = page.locator('article:has-text("Neemrana Fort-Palace")').first();
    const addNeemranaBtn = neemranaArticle.locator('button:has-text("Add Rest Stop")');
    if (await addNeemranaBtn.isVisible()) {
      await addNeemranaBtn.click();
      await expect(neemranaArticle.locator("text=Added to Trip")).toBeVisible({ timeout: 10000 });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11_stops_selected.png") });

    // Continue to Review
    await page.locator('button:has-text("Continue to Review")').click();

    // 8. Review step
    await page.waitForURL("**/review", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "12_trip_review.png") });

    // Assert normal total = ₹27,376
    await expect(page.locator("text=₹27,376").first()).toBeVisible();

    // Click Confirm & Proceed
    await page.locator('button:has-text("Confirm & Proceed")').first().click();

    // 9. Traveller Details step
    await page.waitForURL("**/travellers", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Fill Traveller 1
    await page.locator("#traveller-0-name").fill("Arjun Kapoor");
    await page.locator("#traveller-0-phone").fill("9810123456");
    await page.locator("#traveller-0-id-type").selectOption("aadhaar");

    // Fill Traveller 2
    await page.locator("#traveller-1-name").fill("Neha Kapoor");
    await page.locator("#traveller-1-phone").fill("9810123457");
    await page.locator("#traveller-1-id-type").selectOption("aadhaar");

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13_traveller_details_filled.png") });

    // Click Continue to Pay
    await page.locator('button:has-text("Continue to Pay")').click();

    // 10. Checkout step
    await page.waitForURL("**/checkout", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "14_checkout_page.png") });

    // Assert checkout total = ₹27,376
    await expect(page.locator("text=₹27,376").first()).toBeVisible();

    // Confirm & Pay
    await page.locator('button:has-text("Confirm & Pay")').click();

    // 11. Confirmed step
    await page.waitForURL("**/confirmed", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Booking Confirmed!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=₹27,376").first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "15_normal_booking_confirmed.png") });

    // Assert booking ref matches TM-######
    const normalRefText = await page.locator("section:has-text('Booking Reference Code') span.font-mono").innerText();
    expect(normalRefText.trim()).toMatch(/^TM-\d{6}$/);

    // 12. View Itinerary
    const currentUrl = page.url();
    const tripIdMatch = currentUrl.match(/\/book\/([a-zA-Z0-9_-]+)\/confirmed/);
    const tripId = tripIdMatch?.[1] ?? "";
    expect(tripId).toBeTruthy();
    userATripId = tripId;
    // Register for afterAll cleanup
    if (tripId) createdTripIds.push(tripId);

    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "16_normal_trip_itinerary.png") });

    // 13. View Invoice
    await page.goto(`/trips/${tripId}/invoice`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("text=Tax Invoice Generating").or(page.locator("text=₹27,376")).first()
    ).toBeVisible();
    await expect(page.locator(`text=${normalRefText.trim()}`).first()).toBeVisible();
  });

  test("2. Commercial Happy Path: Non-member empty state -> Corporate setup -> Volvo 9600 -> Total ₹2,27,150 -> Confirmed TM-###### -> Logged-out Ticket Verification", async ({
    page,
    browser,
    context,
  }) => {
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    // 1. Non-member Empty State Check (derived strictly from real company_members rows)
    await page.goto("/login");
    await page.locator("#email").fill("nonmember@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 15000 });

    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "18_commercial_nonmember_empty_state.png") });

    // Assert non-member empty state is visible without ?simulate=non-member
    await expect(page.locator("text=Enterprise Membership Required")).toBeVisible();

    // 2. Corporate Admin Login
    await context.clearCookies();
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/login");
    await page.locator("#email").fill("arjun.kapoor@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 15000 });

    // 3. Commercial Intro
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "19_commercial_intro.png") });

    await expect(page.getByText("Affiliated: Acme Tech Pvt Ltd")).toBeVisible();

    // Start booking
    await page.locator('button:has-text("Start New Commercial Booking")').click();

    // 4. Commercial Setup step
    await page.waitForURL("**/commercial/**/setup", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Commercial Trip Details").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Number of Travelers").first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "20_commercial_setup.png") });

    // Continue to bus selection
    await page.locator('button:has-text("Continue to Bus Selection")').click();

    // 5. Commercial Bus & Seating step
    await page.waitForURL("**/commercial/**/bus", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Volvo 9600").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=₹1,92,500").first()).toBeVisible({ timeout: 15000 });

    // Select Volvo 9600 Luxury Multi-Axle if not already configured
    const volvoBtn = page.locator('article:has-text("Volvo 9600") button:has-text("Select Fleet")');
    if (await volvoBtn.isVisible()) {
      await volvoBtn.click();
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "21_commercial_bus_seating.png") });

    // Assert estimated charter cost (5 days * ₹38,500 = ₹1,92,500)
    await expect(page.locator("text=₹1,92,500").first()).toBeVisible();

    // Continue to Review & Confirm
    await page.locator('button:has-text("Continue to Review & Confirm")').click();

    // 6. Commercial Confirmed step
    await page.waitForURL("**/commercial/**/confirmed", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "22_commercial_confirmed.png") });

    // Assert commercial total on confirmation = ₹2,27,150
    await expect(page.locator("text=₹2,27,150").first()).toBeVisible();

    // Assert booking ref matches TM-######
    const commercialRef = await page.locator("span.font-label-badge:has-text('TM-')").first().innerText();
    expect(commercialRef.trim()).toMatch(/TM-\d{6}/);

    // Register commercial trip ID for afterAll cleanup
    const commercialConfirmedUrl = page.url();
    const commercialTripMatch = commercialConfirmedUrl.match(/\/commercial\/([a-zA-Z0-9_-]+)\/confirmed/);
    const commercialTripId = commercialTripMatch?.[1] ?? "";
    if (commercialTripId) createdTripIds.push(commercialTripId);

    // Open first passenger ticket modal
    await page.locator('button:has-text("Ticket")').first().click();
    const modalCodeEl = page.locator("text=Code: TKT-").first();
    await expect(modalCodeEl).toBeVisible();
    const rawModalText = await modalCodeEl.innerText();
    const ticketCodeMatch = rawModalText.match(/TKT-[A-Z0-9]{12}/);
    expect(ticketCodeMatch).toBeTruthy();
    const ticketCode = ticketCodeMatch![0];

    // 7. Logged-out Public Ticket Verification
    const loggedOutContext = await browser.newContext();
    const loggedOutPage = await loggedOutContext.newPage();

    const response = await loggedOutPage.goto(`http://localhost:3000/tickets/${ticketCode}`);
    expect(response?.status()).toBe(200);
    await loggedOutPage.waitForLoadState("networkidle");

    await loggedOutPage.screenshot({ path: path.join(SCREENSHOT_DIR, "23_public_ticket_logged_out.png") });

    // Assert pass verification and details
    await expect(loggedOutPage.locator("text=Verified Pass")).toBeVisible();
    await expect(loggedOutPage.locator(`text=${ticketCode}`)).toBeVisible();
    await expect(loggedOutPage.locator("text=Seat Assignment")).toBeVisible();

    // Assert NO phone number appears on public ticket page
    const pageText = await loggedOutPage.innerText("body");
    expect(pageText).not.toContain("+91");
    expect(pageText).not.toMatch(/\b\d{10}\b/);

    await loggedOutContext.close();
  });

  test("3. Security & Upload Verification: User B unauthorized redirect from User A /trips/[id] & 4 MB ID upload succeeds", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Part A: User B logs in and attempts to access User A's confirmed trip
    await page.goto("/login");
    await page.locator("#email").fill("member@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 15000 });

    const targetTripId = userATripId || "11111111-1111-1111-1111-111111111111";
    await page.goto(`/trips/${targetTripId}`);
    // Unauthorized access must redirect away from /trips/[id] to /home
    await page.waitForURL("**/home", { timeout: 20000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/home/);

    // Part B: 4 MB ID upload succeeds in the traveller step
    const jaipurPlanBtn = page.locator('a[href="/destinations/jaipur"]').first();
    await jaipurPlanBtn.click();
    await page.waitForURL("**/destinations/jaipur", { timeout: 15000 });

    await page.locator("#planTripBtn").click();
    await page.locator('button:has-text("Family")').click();
    await page.locator('button:has-text("Continue to Dates")').click();

    await page.waitForURL("**/duration", { timeout: 15000 });
    await page.locator('button:has-text("Continue to Hotels")').click();

    await page.waitForURL("**/hotel", { timeout: 15000 });
    await page.locator('button:has-text("Next: Transport")').click();

    await page.waitForURL("**/vehicle", { timeout: 15000 });
    await page.locator('button:has-text("Continue")').click();

    await page.waitForURL("**/stops", { timeout: 15000 });
    await page.locator('button:has-text("Continue to Review")').click();

    await page.waitForURL("**/review", { timeout: 15000 });
    await page.locator('button:has-text("Confirm & Proceed")').first().click();

    // Now on /travellers step
    await page.waitForURL("**/travellers", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Create a 4 MB mock ID document
    const tempFilePath = path.join(process.cwd(), "e2e/temp_test_id_document.pdf");
    const fourMbBuffer = Buffer.alloc(4 * 1024 * 1024, "a");
    // Write standard PDF header
    fourMbBuffer.write("%PDF-1.4\n", 0);
    fs.writeFileSync(tempFilePath, fourMbBuffer);

    try {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(tempFilePath);

      // Verify upload succeeds and displays 4.0 MB • Encrypted copy
      await expect(
        page.locator("text=4.0 MB • Encrypted copy").first()
      ).toBeVisible({ timeout: 60000 });
      await expect(
        page.locator("text=temp_test_id_document.pdf").first()
      ).toBeVisible({ timeout: 60000 });
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {
          // Ignore Windows file lock during test cleanup
        }
      }
    }
  });

  test("4. Normal Flow: Alsisar Haveli (not default) + Dzire + Neemrana + 4 days + 2 travellers review total = ₹31,624 equals trips.total_amount", async ({
    page,
    context,
  }) => {
    // 1. Bypass onboarding
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    // 2. Login as demo user
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("#email").fill("arjun.kapoor@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 15000 });

    // 3. Navigate to Jaipur destination detail
    const jaipurPlanBtn = page.locator('a[href="/destinations/jaipur"]').first();
    await jaipurPlanBtn.click();
    await page.waitForURL("**/destinations/jaipur", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Click "Plan This Trip" and select group type
    await page.locator("#planTripBtn").click();
    await page.locator('button:has-text("Family")').click();
    await page.locator('button:has-text("Continue to Dates")').click();

    // 4. Duration step: 4 days, 2 travellers
    await page.waitForURL("**/duration", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Select 4 days
    const fourDaysBtn = page.locator('button:has-text("4 Days")').first();
    if (await fourDaysBtn.isVisible()) {
      await fourDaysBtn.click();
    }

    // Increase travelers to 2
    const addTravelerBtn = page.locator('button[aria-label="Increase traveler count"]');
    await addTravelerBtn.click();

    // Continue to Hotels
    await page.locator('button:has-text("Continue to Hotels")').click();

    // 5. Hotel step: Alsisar Haveli (not default hotel Shahpura Haveli)
    await page.waitForURL("**/hotel", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const alsisarCard = page.locator('div.hotel-card:has-text("Alsisar Haveli")');
    await alsisarCard.scrollIntoViewIfNeeded();
    const alsisarSelectBtn = alsisarCard.locator('button:has-text("Select Room")');
    if ((await alsisarSelectBtn.count()) > 0) {
      await alsisarSelectBtn.click();
    }
    await expect(alsisarCard.locator('button:has-text("Selected")')).toBeVisible({ timeout: 10000 });

    // Continue to Transport
    await page.locator('button:has-text("Next: Transport")').click();

    // 6. Vehicle step: Maruti Suzuki Dzire
    await page.waitForURL("**/vehicle", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const dzireCard = page.locator('div.bg-card-surface:has(h3:has-text("Dzire"))');
    await dzireCard.scrollIntoViewIfNeeded();
    const dzireApplyBtn = dzireCard.locator('button:has-text("Apply Ride")');
    if ((await dzireApplyBtn.count()) > 0) {
      await dzireApplyBtn.click();
    }
    await expect(dzireCard.locator("text=Applied")).toBeVisible({ timeout: 10000 });

    // Continue to Rest Stops
    await page.locator('button:has-text("Continue")').click();

    // 7. Stops step: Neemrana
    await page.waitForURL("**/stops", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const neemranaArticle = page.locator('article:has-text("Neemrana Fort-Palace")').first();
    const addNeemranaBtn = neemranaArticle.locator('button:has-text("Add Rest Stop")');
    if (await addNeemranaBtn.isVisible()) {
      await addNeemranaBtn.click();
      await expect(neemranaArticle.locator("text=Added to Trip")).toBeVisible({ timeout: 10000 });
    }

    // Continue to Review
    await page.locator('button:has-text("Continue to Review")').click();

    // 8. Review step
    await page.waitForURL("**/review", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Extract tripId from URL
    const reviewUrl = page.url();
    const tripIdMatch = reviewUrl.match(/\/book\/([a-zA-Z0-9_-]+)\/review/);
    const tripId = tripIdMatch?.[1] ?? "";
    expect(tripId).toBeTruthy();
    // Register for afterAll cleanup
    if (tripId) createdTripIds.push(tripId);

    // Assert the review total is exactly ₹31,624
    await expect(page.locator("text=₹31,624").first()).toBeVisible({ timeout: 10000 });

    // Read trips.total_amount as the logged-in user via Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(supabaseUrl, anonKey);
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: "arjun.kapoor@tripmate.io",
      password: DEMO_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data: tripRow, error: tripFetchError } = await userClient
      .from("trips")
      .select("total_amount")
      .eq("id", tripId)
      .single();

    expect(tripFetchError).toBeNull();
    expect(Number(tripRow?.total_amount)).toBe(31624);

    // Assert review total equals trips.total_amount read as the logged-in user
    const reviewTotalText = await page.locator("text=₹31,624").first().innerText();
    const parsedReviewTotal = Number(reviewTotalText.replace(/[^0-9]/g, ""));
    expect(parsedReviewTotal).toBe(Number(tripRow?.total_amount));
  });

  test("5. Admin Role-Based Access Guard: Unauthenticated redirected to /admin/login, customer redirected to /home, operator login succeeds", async ({
    page,
    context,
  }) => {
    // A. Unauthenticated user visits /admin -> must redirect to /admin/login
    await context.clearCookies();
    await page.goto("/admin");
    await page.waitForURL("**/admin/login", { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("text=TripMate Admin Portal")).toBeVisible();

    // B. Authenticated customer visits /admin -> must redirect to /home to prevent privilege escalation
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("#email").fill("arjun.kapoor@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 25000 });

    // Customer attempts to navigate to /admin
    await page.goto("/admin");
    await page.waitForURL("**/home", { timeout: 15000 });
    await expect(page).toHaveURL(/\/home/);

    // C. Operator authenticates via /admin/login -> successfully enters /admin
    await context.clearCookies();
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=TripMate Admin Portal")).toBeVisible();

    // Fill Operator credentials into the login form
    await page.locator('input[type="email"]').fill("tripmateoffical007@gmail.com");
    await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/admin", { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("text=Operations Center")).toBeVisible();
  });

  test("6. Access Control: Normal logged-in customer cannot reach /admin and redirects to /home", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies([
      {
        name: "tripmate_onboarding_completed",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("#email").fill("arjun.kapoor@tripmate.io");
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/home", { timeout: 25000 });

    // Directly attempt to access /admin
    await page.goto("/admin");
    await page.waitForURL("**/home", { timeout: 15000 });
    await expect(page).toHaveURL(/\/home/);

    // Directly attempt to access /admin/bookings
    await page.goto("/admin/bookings");
    await page.waitForURL("**/home", { timeout: 15000 });
    await expect(page).toHaveURL(/\/home/);
  });
});
