# SCREENS.md — Stitch Design Screen Inventory & Analysis

Source of truth inventory of all 20 exported screens in `Tripmate_screens/` (referenced in documentation as `/design-reference/stitch-exports/`). Every screen, label, value, input, button, and navigation flow is captured verbatim from the exported HTML artifacts.

---

## 1. Screen Inventory

---

### Screen 01: Splash Screen
- **File path:** `Tripmate_screens/splash_screen/code.html` (alias: `/design-reference/stitch-exports/splash_screen`)
- **Flow:** `onboarding`
- **Purpose:** Brand splash entry point showing application loading and asset synchronization status.
- **Data displayed:**
  - System status indicator: `SYS.READY` (pulsing red dot)
  - System build/version: `V2.4`
  - Brand Emblem: Geometric `M` vector monogram in red rounded squircle badge
  - App Logotype: `Tripmate`
  - Brand Sub-label: `Trip OS`
  - Tagline: `Plan. Ride. Stay.`
  - Sync status text: `Syncing Itinerary Assets ...`
  - Progress bar: animated 0% → 65% → 100%
- **User inputs:** None.
- **Buttons and links:** None (automatic timed transition).
- **Navigation:**
  - **Before:** None (app launch).
  - **After:** `onboarding_flow` (first launch) or `login_signup` / `home_destination_discovery`.

---

### Screen 02: Onboarding Flow
- **File path:** `Tripmate_screens/onboarding_flow/code.html` (alias: `/design-reference/stitch-exports/onboarding_flow`)
- **Flow:** `onboarding`
- **Purpose:** Multi-step introductory carousel explaining Tripmate's core value propositions for trips, stays, and highway stops.
- **Data displayed:**
  - Header mark: `Tripmate` (with explore icon)
  - Quick slide chips: `01 Discover` (active on slide 1), `02 Plan`, `03 Journey`
  - Slide 1:
    - Category badge: `Curated Travel` (verified icon)
    - Counter: `01 / 03`
    - Headline: `Discover places worth finding`
    - Description: `Handpicked spots across India curated for road trippers and explorers.`
    - Feature tags: `Uncharted Valleys`, `Off-Grid Maps`, `Scenic Highway Viewpoints`
    - CTA label: `Explore Trips`
    - Background: Mountain highway in Ladakh/Spiti
  - Slide 2:
    - Category badge: `Integrated Booking`
    - Counter: `02 / 03`
    - Headline: `Plan hotels, rides & rest stops in one go`
    - Description: `Book boutique heritage stays, verified chauffeurs, and midway highway pauses in a single seamless itinerary.`
    - Feature tags: `Heritage Haveli Stays`, `Chauffeur-Driven SUVs`, `Verified Food Stops`
    - CTA label: `Preview Stays & Rides`
    - Background: Boutique desert palace hotel in Rajasthan
  - Slide 3:
    - Category badge: `Assurance Guaranteed`
    - Counter: `03 / 03`
    - Headline: `Built for real trips, not just bookings`
    - Description: `Live concierge support, guaranteed clean stops, and verified corporate or solo routes.`
    - Feature tags: `24/7 Road Concierge`, `Clean Restroom Seal`, `Corporate-Ready Billing`
    - CTA label: `Get Started`
    - Background: Coastal cliff road in South India
  - Pagination indicator: 3 horizontal bar dots
  - Secondary text: `Already have an account? Log in`
- **User inputs:**
  - Swipe gestures (touch drag left/right)
- **Buttons and links:**
  - `Skip` button (header) → Navigates to Slide 3 or `login_signup`
  - Slide indicator chips (`01 Discover`, `02 Plan`, `03 Journey`) → Navigates to respective slide
  - Previous slide arrow button → Previous slide
  - Next slide arrow button → Next slide
  - Primary CTA button (`Explore Trips` / `Preview Stays & Rides` / `Get Started`) → Next slide, or on Slide 3 navigates to `login_signup`
  - Secondary link `Log in` → Navigates to `login_signup`
- **Navigation:**
  - **Before:** `splash_screen`
  - **After:** `login_signup`

---

### Screen 03: Login & Sign Up
- **File path:** `Tripmate_screens/login_signup/code.html` (alias: `/design-reference/stitch-exports/login_signup`)
- **Flow:** `onboarding` / `shared`
- **Purpose:** User authentication interface supporting email/phone input, dynamic registration field, and social sign-in options.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, screen title `Login`, info button, profile avatar icon
  - Segmented switcher: `Log In` / `Sign Up`
  - Emblem: Red square badge with `M` lettermark, `Tripmate` title, `TRIP OS` pill badge
  - Mode titles & subheadings:
    - Log In mode: Heading `Welcome to Tripmate`, Subheading `Plan hotels, rides & rest stops in one go`
    - Sign Up mode: Heading `Create Tripmate Account`, Subheading `Unlock group trip sync & shared road books`
  - Input labels: `Phone number or Email`, `Full Name` (in Sign Up mode)
  - Divider: `or connect with`
  - Social options:
    - `Instant OTP via WhatsApp` (with green chat icon, `FAST` badge)
    - `Continue with Google` (with 4-color Google vector logo)
    - `Continue with Apple` (with Apple vector logo)
  - Trust banner: `100% verified & secure booking` (with shield icon)
  - Mode toggle prompt: `New here? Sign up` (Log In) / `Already have an account? Log in` (Sign Up)
  - Feedback toast pill: `Connecting to security gateway...` / `lock_clock`
- **User inputs:**
  - Segmented tab toggle: `Log In` vs `Sign Up`
  - Text input: `identifier` (placeholder: `Enter mobile or email`)
  - Text input (dynamic for Sign Up): `full-name` (placeholder: `e.g. Maya Chen`)
- **Buttons and links:**
  - Header back arrow (`history.back()`)
  - Primary CTA button: `Continue` (Log In) / `Join Tripmate` (Sign Up) → Submits form, navigates to `home_destination_discovery`
  - `Instant OTP via WhatsApp` button → Triggers social/phone auth simulation
  - `Continue with Google` button → Triggers Google OAuth
  - `Continue with Apple` button → Triggers Apple OAuth
  - Mode toggle button (`Sign up` / `Log in`) → Toggles between login and signup modes
- **Navigation:**
  - **Before:** `onboarding_flow` (or `/login` direct)
  - **After:** `home_destination_discovery`

---

### Screen 04: Home — Destination Discovery (Default)
- **File path:** `Tripmate_screens/home_destination_discovery/code.html` (alias: `/design-reference/stitch-exports/home_destination_discovery`)
- **Flow:** `normal booking` / `shared`
- **Purpose:** Main discovery landing tab featuring destination catalog search, theme filters, and featured destination cards with package starting prices.
- **Data displayed:**
  - Top header: Tripmate logo, `Tripmate` brand, `Home` subtitle, Notifications bell button, Profile avatar icon
  - Search bar placeholder: `Where do you want to explore?`
  - Category filter chips: `Popular` (active), `Hidden Gems`, `Less Discovered`, `Nature`, `Heritage`, `Weekend Getaways`
  - Section title: `India's Most Popular Destinations`
  - Section subtitle: `Handpicked iconic gateways curated for your next adventure`
  - Destination Card 1:
    - Image: Hawa Mahal, Jaipur (4:3)
    - Badge: `🔥 Trending this week`
    - Overlaid tag: `Jaipur` | `The Pink City • 3-5 days recommended`
    - Price label: `Starting package`
    - Price value: `From ₹12,499/person`
    - CTA: `Plan This Trip`
  - Destination Card 2:
    - Image: Lake Pichola, Udaipur (4:3)
    - Badge: `High demand today`
    - Overlaid tag: `Udaipur` | `City of Lakes • Heritage Stays`
    - Price label: `Starting package`
    - Price value: `From ₹14,800/person`
    - CTA: `Plan This Trip`
  - Destination Card 3:
    - Image: Tea Hills, Munnar (4:3)
    - Badge: `Popular in Monsoon`
    - Overlaid tag: `Munnar` | `Misty Tea Plantations • Nature Escape`
    - Price label: `Starting package`
    - Price value: `From ₹9,200/person`
    - CTA: `Plan This Trip`
  - Destination Card 4:
    - Image: Vittala Temple Stone Chariot, Hampi (4:3)
    - Overlaid tag: `Hampi` | `Ancient Boulders & Temples • UNESCO site`
    - Price label: `Starting package`
    - Price value: `From ₹7,500/person`
    - CTA: `Plan This Trip`
  - Floating bottom navigation: 4 tabs: `Home` (active), `Trips`, `Commercial`, `Profile`
- **User inputs:**
  - Text input: Search field `Where do you want to explore?`
  - Filter chip selectors: `Popular`, `Hidden Gems`, `Less Discovered`, `Nature`, `Heritage`, `Weekend Getaways`
- **Buttons and links:**
  - Filter options icon button (`tune`) → Opens filters
  - Notifications bell button → Opens notifications
  - `Plan This Trip` (Jaipur card) → Navigates to `destination_detail_jaipur`
  - `Plan This Trip` (other cards) → Navigates to `/destinations/[slug]`
  - Bottom nav tabs → Navigates to `home_destination_discovery`, `recent_trips`, `b2b_commercial_trip_intro_overview`, `profile`
- **Navigation:**
  - **Before:** `login_signup`
  - **After:** `destination_detail_jaipur` (tap destination), `home_search_filter_applied` (search applied), `home_empty_state` (no results)

---

### Screen 05: Home — Search Filter Applied
- **File path:** `Tripmate_screens/home_search_filter_applied/code.html` (alias: `/design-reference/stitch-exports/home_search_filter_applied`)
- **Flow:** `normal booking` / `shared`
- **Purpose:** Search results state showing curated trip circuits in a specific destination (Jaipur) matching query and category filter.
- **Data displayed:**
  - Top header: Tripmate logo, `Tripmate`, notifications bell, profile avatar
  - Active search input value: `Jaipur, Rajasthan` with clear `close` button
  - Category filter chips: `Heritage` (active with castle icon), `Hidden Gems`, `Popular`, `Nature`, `Weekend Getaways`
  - Results counter: `4 Curated Trips in Jaipur`
  - Sort dropdown trigger: `Best Match` (options: `Best Match`, `Duration`, `Price: Low`)
  - Circuit Card 1:
    - Image: Amber Fort / Hawa Mahal (4:3)
    - Badge: `🔥 Trending this week`
    - Wishlist button: Heart icon
    - Overlaid title: `Jaipur Heritage & Forts Circuit` | Rating: `★ 4.9`
    - Duration & stay: `4 Days / 3 Nights • Heritage Havelis & Cab`
    - Description: `Amber Palace sunrise, City Palace museum pass, private sedan & local culinary trail.`
    - Price: `From ₹12,499 / person`
    - Button: `Plan This Trip`
  - Circuit Card 2:
    - Image: Nahargarh Fort ramparts (4:3)
    - Badge: `⚡ High demand for winter`
    - Wishlist button: Heart icon
    - Overlaid title: `Amer & Nahargarh Valley Escape` | Rating: `★ 4.8`
    - Duration & stay: `3 Days / 2 Nights • Chauffeur SUV & Fort Villa`
    - Description: `Nahargarh sunset drinks, stepwell tour at Panna Meena Ka Kund & stargazing camp.`
    - Price: `From ₹9,800 / person`
    - Button: `Plan This Trip`
  - Circuit Card 3:
    - Image: Johari Bazaar crafts (4:3)
    - Badge: `✨ Handcrafted Experience`
    - Wishlist button: Heart icon
    - Overlaid title: `Royal Artisans & Bazaars` | Rating: `★ 4.95`
    - Duration & stay: `2 Days / 1 Night • Artisan Masterclasses`
    - Description: `Private block printing studio, blue pottery studio access & guided evening food walk.`
    - Price: `From ₹6,450 / person`
    - Button: `Plan This Trip`
  - Circuit Card 4:
    - Image: Samode Palace courtyard (4:3)
    - Badge: `🔥 Selling fast`
    - Wishlist button: Heart icon
    - Overlaid title: `Samode Palace Luxury Retreat` | Rating: `★ 5.0`
    - Duration & stay: `3 Days / 2 Nights • All-Inclusive Palace Stay`
    - Description: `Heritage luxury suite, candlelit courtyard dining & countryside desert drive.`
    - Price: `From ₹21,500 / person`
    - Button: `Plan This Trip`
  - Bottom navigation bar: `Home` (active), `Trips`, `Commercial`, `Profile`
- **User inputs:**
  - Text input: `search-input` (value: `Jaipur, Rajasthan`)
  - Selector: Filter chips (`Heritage`, `Hidden Gems`, etc.)
  - Selector: Sort dropdown (`Best Match`, `Duration`, `Price: Low`)
  - Toggle: Wishlist heart button per card
- **Buttons and links:**
  - Clear search button (`clear-search-btn`) → Clears input and resets search
  - `Plan This Trip` CTA on any card → Navigates to `destination_detail_jaipur`
  - Bottom nav tabs → Navigates to respective root tab
- **Navigation:**
  - **Before:** `home_destination_discovery`
  - **After:** `destination_detail_jaipur`

---

### Screen 06: Home — Empty State
- **File path:** `Tripmate_screens/home_empty_state/code.html` (alias: `/design-reference/stitch-exports/home_empty_state`)
- **Flow:** `normal booking` / `shared`
- **Purpose:** Zero-match feedback screen with query clear actions and fallback recommendations ("Trending Alternatives").
- **Data displayed:**
  - Active search input value: `Spiti Offroad Winter` with clear button
  - Active filter chips: `Offbeat Snow Trails` (active with close icon), `Dec - Feb`, `4x4 Expeditions`, `Budget ₹15k-₹30k`
  - Empty state icon: `explore_off`
  - Empty state heading: `No destinations match this filter yet`
  - Empty state body: `Try adjusting your dates, removing specific filter tags, or exploring all popular circuits across India.`
  - Fallback section: `Trending Alternatives` | Subtitle: `Readily confirmed circuits with peak winter availability` | Link: `View 18 more`
  - Alternative Card 1:
    - Image: Amber Fort courtyard (4:3)
    - Badge: `bolt Fast Selling`
    - Rating: `★ 4.9`
    - Title: `Jaipur Heritage Circuit`
    - Subtitle: `Rajasthan • 3 Days, 2 Nights • Forts & Bazaars`
    - Price: `Starting from ₹8,499 /person`
    - Action: Arrow forward icon button
  - Alternative Card 2:
    - Image: City Palace on Lake Pichola (4:3)
    - Badge: `verified Curated Luxe`
    - Rating: `★ 4.95`
    - Title: `Udaipur Lakeside Retreat`
    - Subtitle: `Rajasthan • 4 Days, 3 Nights • Palaces & Sunset Cruises`
    - Price: `Starting from ₹12,200 /person`
    - Action: Arrow forward icon button
  - Bottom navigation bar: `Home` (active), `Trips`, `Commercial`, `Profile`
- **User inputs:**
  - Text input: `search-input` (value: `Spiti Offroad Winter`)
  - Selector: Filter chips
- **Buttons and links:**
  - Clear query button (`close`) → Clears input
  - `Clear all filters` button → Resets filters to default `home_destination_discovery`
  - `Browse All Circuits` button → Navigates to `home_destination_discovery`
  - `View 18 more` link → Navigates to `home_destination_discovery`
  - Alternative card arrow button → Navigates to `destination_detail_jaipur`
  - Bottom nav tabs → Navigates to respective root tab
- **Navigation:**
  - **Before:** `home_destination_discovery` or `home_search_filter_applied`
  - **After:** `home_destination_discovery` (clear filters) or `destination_detail_jaipur` (tap alternative)

---

### Screen 07: Destination Detail (Jaipur)
- **File path:** `Tripmate_screens/destination_detail_jaipur/code.html` (alias: `/design-reference/stitch-exports/destination_detail_jaipur`)
- **Flow:** `normal booking`
- **Purpose:** Comprehensive destination overview displaying media, key highlights/sightseeing items, package inclusions, and booking entry point.
- **Data displayed:**
  - Top header: Back arrow, Tripmate logo, title `Trip Itinerary Detail`, share button, profile avatar
  - Hero image: Hawa Mahal facade (4:3)
  - Hero overlaid buttons: `Explore` back pill, share button, bookmark button
  - Urgency badge: `🔥 High demand for winter`
  - Destination name: `Jaipur, Rajasthan`
  - Verified badge: `Tripmate Verified` (green check)
  - Tagline/description: `Palaces, bustling bazaars, and royal heritage in the heart of Rajasthan.`
  - Attribute pills:
    - Rating: `★ 4.8 (3.2k)`
    - Duration: `3–4 Days`
    - Best season: `Oct–Mar`
  - Highlights section header: `Things to see & experience` (`4 highlights`)
  - Highlight 1: `Hawa Mahal & Old City Walk` | `Heritage • 2.5 hrs` | `Must Visit` badge | `Guided audio` | arrow icon
  - Highlight 2: `Amber Palace & Elephant Route` | `Iconic Fort • 4 hrs` | `Entry ticket` | arrow icon
  - Highlight 3: `Nahargarh Sunset Point` | `Viewpoint & Cafe • 2 hrs` | `Golden Hour` | arrow icon
  - Highlight 4: `Johari Bazaar Textile & Gems` | `Local Market • 3 hrs` | `Local guide` | arrow icon
  - Composition section: `Typical Trip Composition` (`Included In Package` badge)
    - Item 1: `Heritage Haveli Stay` | `Traditional courtyards, breakfast included` | `check_circle` (included)
    - Item 2: `Dedicated Cab / Rental` | `Private AC sedan with local certified chauffeur` | `check_circle` (included)
    - Item 3: `Curated Dhaba & Fort Rest Stops` | `Authentic dal baati churma meal voucher` | `Optional` badge
  - Trust card: `Tripmate Guarantee` | `Free cancellation up to 48 hours prior to departure date.`
  - Sticky bottom shelf:
    - Price label: `Starting from`
    - Price value: `₹12,499 / person`
    - CTA button: `Plan This Trip`
- **User inputs:**
  - Bookmark/save toggle button
- **Buttons and links:**
  - Header back button (`history.back()`)
  - Hero back pill (`Explore`) (`history.back()`)
  - Share button (`shareBtn`) → Triggers Web Share API or copy
  - Bookmark button (`bookmarkBtn`) → Toggles saved destination
  - Highlight cards arrow buttons → Highlight preview
  - `Plan This Trip` CTA (`planTripBtn`) → Creates draft trip and navigates to `trip_duration_selector`
- **Navigation:**
  - **Before:** `home_destination_discovery` / `home_search_filter_applied`
  - **After:** `trip_duration_selector`

---

### Screen 08: Trip Duration Selector
- **File path:** `Tripmate_screens/trip_duration_selector/code.html` (alias: `/design-reference/stitch-exports/trip_duration_selector`)
- **Flow:** `normal booking`
- **Purpose:** First builder configuration step allowing the user to select the trip duration, fine-tune days/nights, and choose dates on a calendar.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Trip Duration`, info icon, profile avatar
  - Context header: `Customizing trip to Jaipur, Rajasthan`
  - Step indicator: `Step 1 of 4 • Itinerary Horizon`
  - Question headline: `How many days is your trip?`
  - Subtitle: `We recommend 3–5 days to explore Jaipur comfortably without rushing.`
  - Destination snippet banner:
    - Scarcity pill: `🔥 High Season: 78% of heritage stays booked`
    - Circuit title: `Pink City Heritage & Forts`
    - Ideal pace: `4 Full Days`
  - Duration chips: `2 Days`, `3 Days`, `4 Days` (selected), `5 Days`, `6+ Days`
  - Stepper block:
    - Title: `Fine-tune Duration`
    - Subtext: `3 Nights accommodation needed`
    - Stepper display: `4 Days`
  - Interactive calendar:
    - Month: `November 2025`
    - Selected range: Nov 14 (check-in) to Nov 18 (check-out)
    - Callout tags: Check-in `Nov 14, 2025` → Check-out `Nov 18, 2025`
  - Estimate summary card:
    - Header: `Trip Itinerary Estimate` | `Best Value` badge
    - Trip Window: `Fri, Nov 14 – Tue, Nov 18`
    - Duration: `4 Days / 3 Nights`
    - Estimated Base Package: `₹12,499 / person`
  - Guarantee pill: `Tripmate Guarantee: Free date changes up to 48 hrs before departure`
  - Sticky bottom shelf:
    - Price lock note: `Base price lock expires in 14:59`
    - Tax note: `Taxes included`
    - CTA button: `Continue to Hotels`
- **User inputs:**
  - Selector: Duration day chips (`2 Days`, `3 Days`, `4 Days`, `5 Days`, `6+ Days`)
  - Stepper: Minus / plus buttons modifying day count (2 to 7 days)
  - Date range: Calendar date pickers (Nov 14 to Nov 18)
- **Buttons and links:**
  - Header back button (`history.back()`)
  - Calendar previous/next month chevrons
  - Stepper decrement button (`decrementBtn`)
  - Stepper increment button (`incrementBtn`)
  - `Continue to Hotels` button (`continueBtn`) → Saves dates to draft trip, navigates to `hotel_selection`
- **Navigation:**
  - **Before:** `destination_detail_jaipur`
  - **After:** `hotel_selection`

---

### Screen 09: Hotel Selection
- **File path:** `Tripmate_screens/hotel_selection/code.html` (alias: `/design-reference/stitch-exports/hotel_selection`)
- **Flow:** `normal booking`
- **Purpose:** Second builder step where users choose their hotel/haveli stay from destination inventory.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Hotel Selection`, info icon, profile avatar
  - Context header:
    - Step tag: `Step 2 of 4: Stay`
    - Destination title: `Jaipur Stays`
    - Trip parameters: `Nov 14 – Nov 18 (4 Days, 3 Nights) • 2 Guests`
  - Filter pills: `Recommended` (active), `Price: Low to High`, `Rating: 4.5+`, `Heritage Haveli`, `Swimming Pool`, `Under ₹5,000`
  - Hotel Card 1 (Selected):
    - Image: Courtyard swimming pool (4:3)
    - Scarcity pill: `Only 2 rooms left` (hourglass icon)
    - Wishlist button: Heart icon
    - Name: `Shahpura Haveli & Heritage Suites`
    - Rating & reviews: `★ 4.8 (840 reviews)`
    - Neighborhood & distance: `Bani Park (1.8 km from center)`
    - Amenities: `Free Breakfast`, `Heritage Courtyard`, `Free WiFi`
    - Nightly price: `₹4,200 / night`
    - Total price: `₹12,600 for 3 nights • incl. taxes`
    - Button: `Selected` (check icon)
  - Hotel Card 2:
    - Image: Palace garden estate (4:3)
    - Scarcity pill: `Selling fast for Nov`
    - Wishlist button: Heart icon
    - Name: `Diggi Palace Heritage Hotel`
    - Rating & reviews: `★ 4.7 (1,210 reviews)`
    - Neighborhood: `C-Scheme, Jaipur`
    - Amenities: `Palace Gardens`, `Outdoor Pool`, `Bar & Lounge`
    - Nightly price: `₹3,499 / night`
    - Total price: `₹10,497 for 3 nights • incl. taxes`
    - Button: `Select Room`
  - Hotel Card 3:
    - Image: Royal fresco suite (4:3)
    - Scarcity pill: `Top Rated Haveli`
    - Wishlist button: Heart icon
    - Name: `Alsisar Haveli`
    - Rating & reviews: `★ 4.9 (620 reviews)`
    - Neighborhood: `Sansar Chandra Road`
    - Amenities: `Rooftop Dining`, `Royal Courtyard`, `Spa & Wellness`
    - Nightly price: `₹5,800 / night`
    - Total price: `₹17,400 for 3 nights • incl. taxes`
    - Button: `Select Room`
  - Sticky bottom shelf:
    - Selection indicator: `1 Hotel Selected` (pulsing green dot)
    - Selected hotel name: `Shahpura Haveli & Heritage Suites`
    - CTA button: `Next: Transport`
- **User inputs:**
  - Selector: Filter pills (`Recommended`, `Price: Low to High`, etc.)
  - Selector: Hotel card selection (`Select Room`)
  - Toggle: Wishlist heart buttons
- **Buttons and links:**
  - Header back button (`history.back()`)
  - `Select Room` button per card → Selects hotel
  - `Next: Transport` CTA button → Writes hotel to `trip_hotels`, navigates to `car_bike_rental_selection`
- **Navigation:**
  - **Before:** `trip_duration_selector`
  - **After:** `car_bike_rental_selection`

---

### Screen 10: Car & Bike Rental Selection
- **File path:** `Tripmate_screens/car_bike_rental_selection/code.html` (alias: `/design-reference/stitch-exports/car_bike_rental_selection`)
- **Flow:** `normal booking`
- **Purpose:** Vehicle selection step offering chauffered cars, SUVs, or self-drive bikes/scooters.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Car Bike`, info icon, profile avatar
  - Context header:
    - Step tag: `Step 2 of 4 • Jaipur Expedition` *(Note duplicate step numbering)*
    - Heading: `Choose Local Ride in Jaipur`
    - Subtitle: `All options include verified drivers or self-drive handover at airport/station.`
  - Mode switcher: `Car Rental` (active) vs `Bike & Scooter`
  - Filter chips: `All Options (8)`, `Sedan (AC)`, `SUV (6 Seater)`, `Self Drive`, `With Chauffeur`
  - Guarantee micro-banner: `Free cancellation up to 2 hours prior to arrival` | `Guaranteed`
  - Vehicle Card 1 (Selected):
    - Image: White Maruti Suzuki Dzire sedan (4:3)
    - Badge top-left: `High demand today` (fire icon)
    - Badge top-right: `Top Rated 4.9` (check icon)
    - Title: `Maruti Suzuki Dzire`
    - Subtitle: `AC Sedan • Dedicated Commercial Fleet`
    - Selection badge: `Selected`
    - Specs matrix: `4 Seater`, `2 Bags`, `Climate Control`, `Pro Chauffeur`
    - Fuel/toll policy: `Fuel & toll taxes covered up to 300 km` (verified icon)
    - Pricing: `₹1,899 / day` | `Total: ₹7,596 (4 days)`
    - Button: `Applied` (check icon)
  - Vehicle Card 2:
    - Image: Silver Toyota Innova Crysta MPV (4:3)
    - Badge top-left: `Only 3 vehicles left` (timer icon)
    - Badge top-right: `4.96 • Luxe`
    - Title: `Toyota Innova Crysta`
    - Subtitle: `Premium SUV • Luxury Travel Group` | `PREMIUM` tag
    - Specs matrix: `6 Captain Seats`, `4 Large Bags`, `On-board WiFi`, `Uniformed Driver`
    - Fuel/toll policy: `Intercity permit included • Mineral water on board`
    - Pricing: `₹3,200 / day` | `Total: ₹12,800 (4 days)`
    - Button: `Select Vehicle`
  - Vehicle Card 3:
    - Image: Matte black Royal Enfield Classic 350 (4:3)
    - Badge top-left: `Popular for solo trips`
    - Badge top-right: `Instant Keyless Handover`
    - Title: `Royal Enfield Classic 350`
    - Subtitle: `Cruiser • Self-Drive Exploration` | `SELF DRIVE` tag
    - Specs matrix: `2 Helmets Provided`, `24/7 Roadside Assist`, `Unlimited KM`
    - Pricing: `₹950 / day` | `Total: ₹3,800 (4 days)`
    - Button: `Select Bike`
  - Commute guarantee card: `Tripmate Commute Guarantee`
    - `Police-verified local chauffeurs`
    - `Zero surge pricing lock`
    - `Jaipur (JAI) terminal meetup`
    - `SOS live trip monitoring`
  - Sticky bottom shelf:
    - Selected summary: `Sedan Selected` (green dot)
    - Total price: `Total: ₹7,596 • 4 days`
    - CTA button: `Continue`
- **User inputs:**
  - Segmented toggle: `Car Rental` vs `Bike & Scooter`
  - Selector: Filter chips
  - Selector: Vehicle card select button
- **Buttons and links:**
  - Header back button (`history.back()`)
  - Mode toggle buttons (`switchMode('car')` / `switchMode('bike')`)
  - Vehicle selection buttons (`selectVehicle(...)`)
  - Bottom `Continue` button (`proceedNext()`) → Writes vehicle to `trip_vehicles`, navigates to `mid_journey_rest_stop`
- **Navigation:**
  - **Before:** `hotel_selection`
  - **After:** `mid_journey_rest_stop`

---

### Screen 11: Mid-Journey Rest Stop
- **File path:** `Tripmate_screens/mid_journey_rest_stop/code.html` (alias: `/design-reference/stitch-exports/mid_journey_rest_stop`)
- **Flow:** `normal booking`
- **Purpose:** Route stop builder step offering verified highway rest stops, food halts, and midway heritage day passes along the road transit.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Rest Stop`, info icon, profile avatar
  - Route advisory:
    - Alert tag: `Long Drive Advisory` (amber dot)
    - Route title: `Delhi NCR → Jaipur Expedition` | `6.5 hrs drive`
    - Route visual progress line: `Delhi (0 km)` → `Halfway Rest Window` (bed icon) → `Jaipur (270 km)`
  - Callout banner:
    - Title: `Break up your 6.5 hr road journey`
    - Body: `Your total drive exceeds 6 hours. We recommend a verified rest stop or midway boutique stay halfway along NH48 to recharge before arriving in Jaipur.`
  - Section header: `Recommended Along Route` | `Handpicked spots directly accessible from NH48` | `2 Stops Verified`
  - Stop Card 1:
    - Image: Neemrana Fort-Palace (4:3)
    - Badge top-left: `Popular stop for this route` (fire icon)
    - Badge bottom-right: `Heritage Landmark` (star icon)
    - Name: `Neemrana Fort-Palace`
    - Location detail: `122 km from Delhi (Approx. 2.5 hrs mark) • Highway direct access`
    - Highlights: `Clean Washrooms`, `Royal Buffet`, `EV Fast Charger`, `Day Pass or Overnight`
    - Price label: `Day Pass from`
    - Price value: `₹1,850 / person`
    - Action button: `Add Rest Stop` / `Added` (with check)
  - Stop Card 2:
    - Image: Highway King Boutique Resort (4:3)
    - Badge top-left: `Verified Hygienic` (green check)
    - Badge bottom-right: `Quick 45m Turnaround` (timer icon)
    - Name: `Highway King Boutique & Food Court`
    - Location detail: `158 km from Delhi (Approx. 3.2 hrs mark) • NH48 Express Bay`
    - Highlights: `Express Gourmet Dining`, `Kids Play Area`, `Premium AC Lounge`
    - Price label: `Meal & Lounge Access`
    - Price value: `₹499 / person`
    - Action button: `Add to Trip`
  - Highway note: `Rest stops automatically sync with your live route navigation and pre-reserve dedicated express vehicle parking.`
  - Sticky bottom action shelf:
    - Secondary button: `Skip Rest Stop`
    - Primary CTA button: `Continue to Review`
- **User inputs:**
  - Selector/toggle: `Add Rest Stop` / `Add to Trip` button per card
- **Buttons and links:**
  - Header back button (`history.back()`)
  - `Add Rest Stop` / `Add to Trip` toggle button (`toggleSelection(...)`)
  - `Skip Rest Stop` button → Skips stop addition, navigates to `trip_itinerary_summary` / `checkout_payment`
  - `Continue to Review` button → Writes stop to `trip_stops`, navigates to `trip_itinerary_summary` / `checkout_payment`
- **Navigation:**
  - **Before:** `car_bike_rental_selection`
  - **After:** `trip_itinerary_summary` (Review) or `checkout_payment`

---

### Screen 12: Checkout & Payment
- **File path:** `Tripmate_screens/checkout_payment/code.html` (alias: `/design-reference/stitch-exports/checkout_payment`)
- **Flow:** `normal booking`
- **Purpose:** Order review and demo payment execution screen displaying the itemized trip bill and payment method selector.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Checkout`, info icon, profile avatar
  - Top meta:
    - Booking reference pill: `Booking Reference #TM-JPR-9841`
    - Price lock timer: `Price locked 14:48` (amber timer icon)
  - Trip Summary Card:
    - Card header: `Trip Summary` | `Jaipur 4D/3N • 2 Travelers` | `Custom Plan` badge
    - Line item 1: `Stay: Shahpura Haveli` | `3 Nights, 2 Guests • Royal Suite` | `₹12,600`
    - Line item 2: `Transport: Maruti Suzuki Dzire` | `4 Days • Dedicated Driver & Fuel incl.` | `₹7,596`
    - Line item 3: `Rest Stop: Neemrana Heritage Pass` | `High Tea Buffet & Entry for 2 Guests` | `₹3,700`
    - Line item 4: `Tripmate Assistance & Fees` | `₹999`
    - Line item 5: `Taxes & GST (18%)` | `₹4,481`
    - Discount row: `EXPLOREINDIA APPLIED` | `Flat celebratory discount` | `- ₹2,000`
    - Total Payable: `Final price inclusive of all taxes` | `₹27,376`
  - Select Payment Method Card:
    - Header: `Select Payment Method` | `All Indian cards, UPI apps & Net Banking accepted` | green lock icon
    - Option 1 (Radio): `UPI` (`FASTEST` badge)
      - Subtext: `Google Pay, PhonePe, Paytm, BHIM or any UPI ID`
      - Text input: `username@upi` with `Verify` button
      - App chips: `GPay`, `PhonePe`, `Paytm`
    - Option 2 (Radio): `Credit / Debit Card` (badges: `VISA`, `MC`, `RuPay`)
      - Subtext: `Instant confirmation with domestic & international cards`
    - Option 3 (Radio): `Net Banking`
      - Subtext: `HDFC, ICICI, SBI, Axis, Kotak and 50+ other Indian banks`
    - Option 4 (Radio): `EMI / Pay Later` (`0% EMI` badge)
      - Subtext: `Credit card EMI & cardless alternatives starting from ₹2,281/mo`
  - Security banner: `256-Bit Bank Grade SSL Encryption • 100% Refundable per Policy`
  - Support card: `Need booking assistance?` | `Direct support via WhatsApp available 24/7 for travelers`
  - Sticky bottom shelf:
    - Amount Due label: `Amount Due`
    - Total amount: `₹27,376`
    - CTA button: `Confirm & Pay ₹27,376`
- **User inputs:**
  - Radio selector: `payment_method` (`upi`, `card`, `netbanking`, `emi`)
  - Text input: UPI ID field (placeholder: `username@upi`)
- **Buttons and links:**
  - Header back button (`history.back()`)
  - UPI ID `Verify` button
  - Primary CTA button: `Confirm & Pay ₹27,376` (`pay-button`) → Calls demo payment, navigates to `booking_confirmation`
- **Navigation:**
  - **Before:** `mid_journey_rest_stop` / `trip_itinerary_summary` (and traveller details form in spec)
  - **After:** `booking_confirmation`

---

### Screen 13: Booking Confirmation
- **File path:** `Tripmate_screens/booking_confirmation/code.html` (alias: `/design-reference/stitch-exports/booking_confirmation`)
- **Flow:** `normal booking`
- **Purpose:** Post-payment success confirmation presenting booking reference code, trip breakdown summary, and voucher actions.
- **Data displayed:**
  - Top header: Back arrow, Tripmate logo, title `Confirmation`, info icon, profile avatar
  - Celebration: Canvas confetti particles, green check circle with celebration badge
  - Heading: `Booking Confirmed!`
  - Subtitle: `Your expedition to Jaipur is locked and confirmed. We have sent the tickets and voucher to your email & WhatsApp.`
  - Booking Reference Card:
    - Label: `BOOKING CONFIRMATION CODE`
    - Status badge: `Confirmed & Paid` (green dot)
    - Reference code: `TM-JAIPUR-8829`
    - Copy button: `Copy` (with `content_copy` icon)
  - Itinerary Recap Card:
    - Banner image: Hawa Mahal facade (4:3)
    - Tag: `4 Days / 3 Nights`
    - Title: `Jaipur, Rajasthan`
    - Dates: `Fri, Nov 14, 2025 – Tue, Nov 18, 2025`
    - Item 1 (Accommodation): `Shahpura Haveli & Heritage Suites` | `Deluxe Courtyard • Heritage Breakfast Included`
    - Item 2 (Private Vehicle & Chauffeur): `Maruti Suzuki Dzire (AC Sedan)` | `Rajesh Kumar • +91 98765 43210`
    - Item 3 (Highway Rest-Stop): `Neemrana Fort-Palace Day Pass` | `Express audio-tour & heritage lunch access`
    - Total Paid strip: `Total Paid: ₹27,376` | `All taxes, toll & fuel included`
  - Assurance strip: `24x7 Tripmate On-Trip Concierge` | `Dedicated live support via WhatsApp and phone`
  - Action buttons:
    - Primary: `View Itinerary & Tickets`
    - Secondary: `Download PDF Voucher`
    - Return link: `Return to Home`
- **User inputs:** None.
- **Buttons and links:**
  - Header back button (`history.back()`)
  - Copy reference code button (`copy-btn`) → Copies `TM-JAIPUR-8829` to clipboard
  - Primary CTA button `View Itinerary & Tickets` → Navigates to `trip_itinerary_summary` (`/trips/[tripId]`)
  - Secondary button `Download PDF Voucher` → Downloads/prints voucher PDF
  - `Return to Home` link → Navigates to `home_destination_discovery` (`/home`)
- **Navigation:**
  - **Before:** `checkout_payment`
  - **After:** `trip_itinerary_summary` or `home_destination_discovery`

---

### Screen 14: Trip Itinerary Summary & Detail
- **File path:** `Tripmate_screens/trip_itinerary_summary/code.html` (alias: `/design-reference/stitch-exports/trip_itinerary_summary`)
- **Flow:** `normal booking` / `shared`
- **Purpose:** Granular day-by-day timeline schedule covering all itinerary stops, pickup times, reservations, route map, package inclusions, and cost breakdown.
- **Data displayed:**
  - Header: Back arrow, screen title `Trip Itinerary`, share button (`ios_share`), profile avatar
  - Overview Card:
    - Status badges: `Curated Custom Itinerary` (green), `Instant Confirmation` (amber)
    - Title: `Jaipur Heritage & Forts Circuit`
    - Route & duration: `Delhi → Neemrana → Jaipur → Amber • 4D / 3N`
    - Meta chips: `2 Travelers`, `Dec 14 - 17, 2024`, `Chauffeur Sedan`, `Heritage Haveli Suite`
  - Day selector tabs: `Day 1: Arrival & Forts` (active), `Day 2: Palaces & Bazaars`, `Day 3: Nahargarh Sunset`, `Day 4: Stepwells & Return`
  - Day 1 Schedule header: `Day 1 Itinerary • Sunday, Dec 14 • 5 Stops`
  - Day 1 Timeline items:
    - Stop 1: `07:30 AM` | `DELHI NCR` | `3h drive`
      - Title: `Private Chauffeur Pickup`
      - Details: `Doorstep pickup in sanitized Toyota Innova Crysta. Refreshing mint wet wipes & chilled spring water bottles onboard.`
      - Driver card: `Assigned Chauffeur: Rajesh Kumar | DL 1Y AA 4088 • 4.96 ★ (180+ trips)`
    - Stop 2: `10:30 AM` | `NEEMRANA` | `1h 15m stop` | `Heritage Rest Stop Included` badge
      - Title: `Courtyard Breakfast at Neemrana Fort`
      - Details: `Pre-reserved open-air veranda table overlooking 15th-century ramparts. Buffet breakfast with traditional kachoris and artisanal coffee.`
    - Stop 3: `01:30 PM` | `JAIPUR OLD CITY` | `Priority Early Check-in` | `3-Night Stay Reserved` badge
      - Title: `Check-in at Samode Haveli`
      - Details: `Traditional Rajasthani dholak welcome, marigold garlands, and chilled saffron-rose cooler. Rest and unpack in your Deluxe Heritage Suite.`
    - Stop 4: `04:00 PM` | `EXPLORATION` | `Fast-Track Entry` | `VIP PASS` badge
      - Title: `City Palace & Royal Astronomical Observatory`
      - Details: `Private heritage historian accompaniment. Includes exclusive access to the Chandra Mahal private inner royal chambers & Peacock Gate.`
      - Historian card: `Private Historian: Dr. Arvind Rathore`
    - Stop 5: `07:30 PM` | `DINNER` | `Table 04 Reserved` | `Signature Experience` badge
      - Title: `Rooftop Dinner Facing Illuminated Hawa Mahal`
      - Details: `Four-course Rajasthani royal thali paired with live Sarangi & Santoor folk acoustics under the desert night sky.`
  - Route visualizer card:
    - Distance: `268 km • Approx. 5h 10m driving` | `LIVE ROUTE` badge
    - Link: `Expand Map`
  - Package inclusions grid (4 cards):
    - `Private Sedan`: `Dedicated AC Innova, fuel, interstate permits, & all toll taxes.`
    - `Haveli Stay`: `3 Nights in Deluxe Suite + gourmet organic breakfasts.`
    - `Fort Rest Stop`: `Reserved dining veranda at Neemrana Fort Courtyard.`
    - `Private Guide`: `Govt certified historian for monuments + skip-the-line QR.`
  - Transparent price breakdown:
    - Base Package (3N Stay & Breakfasts): `₹22,400`
    - Chauffeur Sedan, Tolls & Fuel (4 Days): `₹3,200`
    - Monuments Fast-Track & Guide Fees: `INCLUDED`
    - Applicable GST & Tourism Cess (5%): `₹1,776`
    - Grand Total: `₹27,376` (`₹13,688 / person for 2 guests`)
  - Cancellation guarantee: `Free modification or cancellation up to 48 hours prior to trip.`
  - Action buttons:
    - `Confirm & Book Trip`
    - `Customize Stops / Edit Days`
  - Fixed bottom drawer:
    - Total Estimate label: `₹1,420 / 2 guests` *(Note discrepancy with card total)*
    - Button: `Confirm & Proceed`
- **User inputs:**
  - Day tab switcher (`selectDay(1)` through `selectDay(4)`)
- **Buttons and links:**
  - Header back button (`history.back()`)
  - Header share button (`ios_share`)
  - `Expand Map` link
  - `Confirm & Book Trip` button → Navigates to `checkout_payment`
  - `Customize Stops / Edit Days` button → Navigates back to builder steps
  - Bottom `Confirm & Proceed` button → Navigates to `checkout_payment`
- **Navigation:**
  - **Before:** `mid_journey_rest_stop` (in review mode) or `booking_confirmation` / `recent_trips` (in detail mode)
  - **After:** `checkout_payment`

---

### Screen 15: Recent Trips (My Trips)
- **File path:** `Tripmate_screens/recent_trips/code.html` (alias: `/design-reference/stitch-exports/recent_trips`)
- **Flow:** `shared`
- **Purpose:** User trips hub listing upcoming booked itineraries and completed past journeys with status badges and invoice access.
- **Data displayed:**
  - Header: Tripmate logo, `Tripmate`, `Recent Trips`, search icon, profile avatar
  - Section header: `My Trips` | Options button (`tune`) | Subtitle: `Keep track of your past adventures and upcoming booked itineraries.`
  - Filter chips: `All Trips (3)` (active), `Upcoming (1)`, `Completed (2)`
  - Trip Card 1 (Upcoming):
    - Image: Hawa Mahal facade (4:3)
    - Status pill: `Upcoming` (pulsing red dot)
    - Countdown pill: `In 12 Days`
    - Dates: `Nov 14 – Nov 18, 2025 • 4 Days / 3 Nights`
    - Title: `Jaipur Heritage & Forts Circuit`
    - Inclusion pills: `Hotel`, `Sedan`, `Neemrana Stop`
    - Price label: `Total Package`
    - Price value: `₹27,376`
    - CTA button: `Manage Itinerary`
  - Trip Card 2 (Completed):
    - Image: Lake Palace Udaipur (4:3)
    - Status pill: `Completed` (green check)
    - Dates: `Oct 02 – Oct 05, 2025 • 3 Days`
    - Title: `Udaipur Lakes & Heritage Retreat`
    - Inclusion pills: `Taj Lake Palace`, `Self-Drive Thar`
    - Price label: `Paid in Full`
    - Price value: `₹34,500`
    - CTA button: `View Invoice & Rebook`
  - Trip Card 3 (Completed):
    - Image: Munnar Tea Gardens (4:3)
    - Status pill: `Completed` (green check)
    - Dates: `Aug 15 – Aug 18, 2025 • 4 Days`
    - Title: `Munnar Misty Hills Escape`
    - Inclusion pills: `Plantation Resort`, `Private Cab`
    - Price label: `Paid in Full`
    - Price value: `₹18,900`
    - CTA button: `View Invoice & Rebook`
  - Empty state (hidden by default): `No trips found` | `You have no trips under this filter category yet.` | CTA: `Plan a New Journey`
  - Travel memories card: `Travel Memories` | `Download PDF memory book of your trips` | Download icon
  - Bottom navigation bar: `Home`, `Trips` (active), `Commercial`, `Profile`
- **User inputs:**
  - Filter chips: `All Trips (3)`, `Upcoming (1)`, `Completed (2)`
- **Buttons and links:**
  - `tune` button (options)
  - `Manage Itinerary` button (Trip 1) → Navigates to `trip_itinerary_summary` (`/trips/[tripId]`)
  - `View Invoice & Rebook` button (Trip 2 & 3) → Navigates to invoice view (`/trips/[tripId]/invoice`)
  - Download memory book button → Triggers PDF download
  - `Plan a New Journey` button (empty state) → Navigates to `home_destination_discovery`
  - Bottom nav tabs → Navigates to respective root tab
- **Navigation:**
  - **Before:** Root bottom tab bar
  - **After:** `trip_itinerary_summary` (`/trips/[tripId]`) or `/trips/[tripId]/invoice`

---

### Screen 16: Profile
- **File path:** `Tripmate_screens/profile/code.html` (alias: `/design-reference/stitch-exports/profile`)
- **Flow:** `profile`
- **Purpose:** User profile overview showing personal credentials, trip metrics, tier progress, and account navigation menus.
- **Data displayed:**
  - Header: Tripmate logo, `Tripmate`, `Profile`, search icon, profile avatar
  - Section header: `My Profile` | Subtitle: `Manage your travels, accounts, and preferences` | `Edit` button
  - User Hero Card:
    - Avatar initials: `AK` (active wanderer green status dot)
    - Name: `Arjun Kapoor`
    - Level badge: `Level 2` (star icon)
    - Email: `arjun.kapoor@tripmate.io`
    - Phone: `+91 98101 23456`
    - Metrics:
      - `14 Trips Taken`
      - `8 Saved Spots`
      - `4,850 KM Logged`
    - Tier progress: `Tripmate Explorer Tier` | `3 trips to Voyager` | progress bar at 68%
  - Spotlight card:
    - Category: `Last Completed Journey`
    - Title: `Coorg Highland Expedition`
    - Subtitle: `Finished 12 Oct • 3 nights • 4 Stays`
    - Action: Chevron right button
  - Account & Preferences Menu (6 items):
    - 1. `Saved Destinations` | `8 destinations bookmarked` | Heart icon
    - 2. `Payment Methods` | `2 UPI IDs, 1 Saved Card` | Credit card icon
    - 3. `Trip Preferences` | `Stays, vehicle types, rest stop preferences` | Tune icon
    - 4. `GST & Corporate Profiles` | `Acme Tech Pvt Ltd` | `B2B` badge | Apartment icon
    - 5. `Help & Support` | `24/7 on-trip concierge & FAQs` | Support agent icon
    - 6. `Settings & Privacy` | `Account security, notifications` | Verified user icon
  - Logout card: `Log Out` (logout icon)
  - Footer: `Tripmate Customer v2.4.0 (Build 8829) • Made in India` | `Terms of Service` | `Privacy Policy`
  - Bottom navigation bar: `Home`, `Trips`, `Commercial`, `Profile` (active)
- **User inputs:** None on main profile screen.
- **Buttons and links:**
  - `Edit` profile button → Navigates to edit profile form
  - `Last Completed Journey` chevron → Navigates to trip detail
  - Menu links 1–6 → Navigates to respective preference sub-pages
  - `Log Out` button (`logoutBtn`) → Clears session, navigates to `login_signup`
  - Legal links (`Terms of Service`, `Privacy Policy`)
  - Bottom nav tabs → Navigates to respective root tab
- **Navigation:**
  - **Before:** Root bottom tab bar
  - **After:** `login_signup` (on logout) or respective sub-settings screens

---

### Screen 17: B2B Commercial Trip Intro & Overview
- **File path:** `Tripmate_screens/b2b_commercial_trip_intro_overview/code.html` (alias: `/design-reference/stitch-exports/b2b_commercial_trip_intro_overview`)
- **Flow:** `commercial`
- **Purpose:** Commercial trip landing tab introducing enterprise group travel advantages, corporate booking steps, and entry CTA.
- **Data displayed:**
  - Header: Tripmate logo, `Tripmate`, `B2B Commercial Trip`, search icon, profile avatar
  - Hero banner:
    - Image: Corporate business team (4:3)
    - Badge: `ENTERPRISE MOBILITY & OFF-SITES` (red dot)
    - Title: `Commercial Trips, Made Simple`
    - Subtitle: `Book and manage group business travel for your company with total peace of mind.`
  - Corporate Advantage horizontal cards:
    - Card 1: `500+ Companies` | `Trust Tripmate for quarterly offsites and team travel.`
    - Card 2: `Avg. 20% Savings` | `Volume corporate rates & direct GST ITC credit pass-through.`
    - Card 3: `24/7 Dedicated Desk` | `Assigned travel coordinator & proactive flight/fleet tracking.`
  - How it works (3 steps):
    - Step 1: `Set trip details` | `Choose travel dates, origin, destination, and passenger headcount.`
    - Step 2: `Choose your bus & fleet` | `Select luxury Volvo coaches, tempo travellers, or executive multi-car fleets.`
    - Step 3: `Confirm & share tickets` | `Generate automated itineraries, centralized GST invoices, and employee passes in one tap.`
  - Compliance banner: `100% GST ITC Compliant` | `Centralized enterprise invoicing & verified fleet operators`
  - Bottom actions:
    - Primary CTA: `Start New Commercial Booking` (arrow icon)
    - Secondary action: `View Past Bookings`
  - Bottom navigation bar: `Home`, `Trips`, `Commercial` (active), `Profile`
- **User inputs:** None.
- **Buttons and links:**
  - Primary CTA button `Start New Commercial Booking` → Creates commercial draft, navigates to `set_up_your_commercial_trip`
  - Secondary button `View Past Bookings` → Scrolls to / opens past commercial bookings list
  - Bottom nav tabs → Navigates to respective root tab
- **Navigation:**
  - **Before:** Root bottom tab bar (`Commercial` tab)
  - **After:** `set_up_your_commercial_trip`

---

### Screen 18: Set Up Your Commercial Trip (Step 1)
- **File path:** `Tripmate_screens/set_up_your_commercial_trip/code.html` (alias: `/design-reference/stitch-exports/set_up_your_commercial_trip`)
- **Flow:** `commercial`
- **Purpose:** Step 1 of commercial booking flow configuring headcount, schedule, departure time, and corporate event purpose.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Commercial Trip Details`, `Step 1 of 3` badge, profile avatar
  - Banner: Executive bus coach photo | `COMMERCIAL FLEET SETUP • STEP 01` badge
  - Section 1: Number of Travelers
    - Title: `Number of Travelers` | Subtitle: `For coach or fleet sizing (Min 1, Max 120)`
    - Stepper display value: `28`
    - Dynamic recommendation: `Recommended: 32-Seater Luxury Volvo or 2 Tempo Travellers`
  - Section 2: Trip Duration & Dates
    - Title: `Trip Duration & Dates` | Subtitle: `Select departure and return schedule`
    - Start date display: `Thu, Nov 20, 2025`
    - End date display: `Mon, Nov 24, 2025`
    - Verified pill: `Schedule verified` | `5 Days • 4 Nights`
  - Section 3: Departure Time
    - Title: `Departure Time` | Subtitle: `Fleet dispatch & driver reporting time`
    - Time display: `07:30 IST`
    - AM/PM toggle switch
    - Preset chips: `06:00 AM Early`, `07:30 AM Recommended`, `09:00 AM Standard`, `10:30 PM Overnight`
  - Section 4: Trip Purpose / Event Name (Optional)
    - Title: `Trip Purpose / Event Name` | `(Optional)` tag
    - Placeholder: `e.g. Engineering Offsite Q4 — Jaipur`
    - Quick tags: `+ Annual Offsite`, `+ Client Visit`, `+ Executive Summit`, `+ Team Building`
  - Sticky bottom shelf:
    - Step tracker: `Step 1 of 3: Fleet sizing & scheduling` (3 indicator dots)
    - Primary CTA button: `Continue to Bus Selection`
    - Micro-copy: `Corporate billing & GST invoice generated on confirmation`
- **User inputs:**
  - Stepper: Minus / plus buttons for passenger count (`dec-btn`, `inc-btn`, value: 28, bounds: 1 to 120)
  - Date selectors: Start date and end date picker triggers
  - Time toggle: AM vs PM toggle buttons
  - Time presets: Quick time chips (`06:00 AM`, `07:30 AM`, `09:00 AM`, `10:30 PM`)
  - Text input: `trip-purpose-input` (placeholder: `e.g. Engineering Offsite Q4 — Jaipur`)
  - Tag buttons: Autofill purpose tags
- **Buttons and links:**
  - Header back button (`history.back()`)
  - `Continue to Bus Selection` button → Saves commercial parameters, navigates to `select_your_bus_seating`
- **Navigation:**
  - **Before:** `b2b_commercial_trip_intro_overview`
  - **After:** `select_your_bus_seating`

---

### Screen 19: Select Your Bus & Seating (Step 2)
- **File path:** `Tripmate_screens/select_your_bus_seating/code.html` (alias: `/design-reference/stitch-exports/select_your_bus_seating`)
- **Flow:** `commercial`
- **Purpose:** Step 2 of commercial booking flow: selecting bus model from inventory and assigning seats to corporate travelers.
- **Data displayed:**
  - Header: Back arrow, Tripmate logo, title `Fleet & Vehicle Selection`, `B2B` badge, profile avatar
  - Progress strip: `2 Step 2 of 3` | 3 bar indicators
  - Section header: `Corporate Fleet Inventory` | `3 Options Available`
  - Fleet Card 1 (Selected):
    - Tag: `SELECTED VEHICLE`
    - Title: `Volvo 9600 Multi-Axle Luxury Coach`
    - Subtitle: `45 Seater AC Semi-Sleeper • BS6 Phase 2`
    - Image: White luxury Volvo coach
    - Amenities: `High-Speed Wi-Fi`, `220V Outlets`, `135° Recline`, `Air Suspension`
    - Rate: `Charter Rate ₹38,500 / day`
    - Action: `Configured` (check_circle)
  - Fleet Card 2:
    - Tag: `STANDBY AVAILABLE`
    - Title: `BharatBenz Executive Glider`
    - Subtitle: `32 Seater AC Pushback • Ergonomic Cabin`
    - Rate: `Charter Rate ₹28,000 / day`
    - Action: `Select Fleet`
  - Fleet Card 3:
    - Tag: `FAST TRANSIT`
    - Title: `Force Urbania Executive Cruiser`
    - Subtitle: `17 Seater Luxury Mini-Coach • Captain Chairs`
    - Rate: `Charter Rate ₹18,500 / day`
    - Action: `Select Fleet`
  - Seating section header: `Select Seats & Assign Travellers` | `Assigning seats for 5 designated travelers (3 of 5 assigned)`
  - Legend: `Available` (white), `Selected` (red fill), `Occupied` (grey fill)
  - Cabin indicators: `Front Entrance` | `Driver Cockpit`
  - Seat Map Grid (6 rows × 4 seats, 2x2 with central aisle):
    - Row 1: `1A` (occupied), `1B` (occupied), `R1`, `1C` (occupied), `1D` (occupied)
    - Row 2: `2A` (selected), `2B` (selected), `R2`, `2C` (available), `2D` (available)
    - Row 3: `3A` (selected), `3B` (available), `R3`, `3C` (available), `3D` (available)
    - Row 4: `4A` (available), `4B` (available), `R4`, `4C` (available), `4D` (available)
    - Row 5: `5A` (occupied), `5B` (occupied), `R5`, `5C` (occupied), `5D` (occupied)
    - Row 6: `6A` (available), `6B` (available), `R6`, `6C` (available), `6D` (available)
    - Hint: `Tap unassigned seat to replace or add travellers`
  - Corporate Roster Assignments (3 Synced):
    - Seat 2A: `Aarav Sharma` | `VP Engineering • Employee #0412` | green check
    - Seat 2B: `Priya Nair` | `Lead Architect • Employee #0789` | green check
    - Seat 3A: `Rohan Verma` | `Product Director • Employee #0104` | green check
    - Prompt card: `+ Assign Travellers 4 & 5` | `Tap available seats 3B, 4A, or pick from directory`
  - Sticky bottom shelf:
    - Cost estimate: `Total Estimated Charter (3 Days): ₹1,15,500`
    - Primary CTA: `Continue to Review & Confirm`
    - Note: `Seat assignments can be adjusted up to 12 hours prior to departure`
- **User inputs:**
  - Selector: Fleet card choice (`Select Fleet`)
  - Selector: Interactive seat buttons (`2A`, `2B`, `3A`, etc.)
- **Buttons and links:**
  - Header back button (`history.back()`)
  - `Select Fleet` buttons on cards 2 & 3
  - Interactive seat buttons
  - `+ Assign Travellers 4 & 5` directory card
  - Primary CTA button `Continue to Review & Confirm` → Navigates to `commercial_booking_confirmed`
- **Navigation:**
  - **Before:** `set_up_your_commercial_trip`
  - **After:** `commercial_booking_confirmed`

---

### Screen 20: Commercial Booking Confirmed (Step 3)
- **File path:** `Tripmate_screens/commercial_booking_confirmed/code.html` (alias: `/design-reference/stitch-exports/commercial_booking_confirmed`)
- **Flow:** `commercial`
- **Purpose:** Commercial booking confirmation screen displaying company trip summary, assigned passenger ticket roster with QR modal triggers, and corporate GST invoice.
- **Data displayed:**
  - Top header: Tripmate logo, `Tripmate Enterprise`, `B2B SECURE` badge
  - Confirmation Banner:
    - Green check circle
    - Reference pill: `TM-CORP-8821 • GST INVOICE READY` (green dot)
    - Headline: `Your Commercial Trip is Booked!`
    - Subtitle: `Corporate itinerary confirmed. Driver details & dispatch tracking assigned 24h prior.`
  - Trip Overview Card:
    - Card header: `Trip Overview` | `CONFIRMED` badge
    - Route / Destination: `Delhi NCR ↔ Jaipur Heritage Circuit`
    - Dates & Duration: `Thu, Nov 20 – Mon, Nov 24, 2025 (5D • 4N)`
    - Reporting & Departure: `07:30 AM IST (Fleet at 07:00 AM)`
    - Fleet Vehicle: `Volvo 9600 Luxury Multi-Axle (45-Seater)`
    - Passenger Headcount: `28 Passengers (5 Exec Reserved)`
    - Purpose / Cost Center: `Engineering Offsite Q4 — Jaipur`
  - Assigned Passenger Tickets Section:
    - Header: `Assigned Passenger Tickets` | `5 OF 28 ISSUED`
    - Subtitle: `5 Executive passes issued • Centralized QR boarding enabled`
    - Passenger 1: `Aarav Sharma` (`EXEC` badge) | `Seat 2A • +91 98765 43210` | `Ticket` button, Copy link button
    - Passenger 2: `Priya Nair` (`EXEC` badge) | `Seat 2B • +91 98112 34567` | `Ticket` button, Copy link button
    - Passenger 3: `Rohan Verma` (`EXEC` badge) | `Seat 3A • +91 99887 65432` | `Ticket` button, Copy link button
    - Passenger 4: `Sneha Kapoor` (`EXEC` badge) | `Seat 3B • +91 97110 98765` | `Ticket` button, Copy link button
    - Passenger 5: `Devansh Mehta` (`EXEC` badge) | `Seat 4A • +91 98223 34455` | `Ticket` button, Copy link button
    - Remaining notice: `23 Regular team passes pending assignment` | `Assign +` button
  - Corporate Invoice Breakdown Card:
    - Header: `Corporate Invoice Breakdown` | `ITC QUALIFIED` badge
    - Line item 1: `Volvo Luxury Coach (5 Days @ ₹38,500/day): ₹1,92,500`
    - Line item 2: `Interstate Permits, Tolls & Allowances: Included`
    - Line item 3: `Applicable GST (18% ITC Pass-Through): ₹34,650`
    - Total package: `Total Corporate Package: ₹2,27,150` | `₹8,112.50 / traveler (28 Pax)`
  - Bottom Actions:
    - Primary CTA button: `Share All Tickets (WhatsApp & Email) →`
    - Secondary CTA button: `Download GST Invoice & Roster (PDF)`
    - Support text: `Need corporate invoice customization? Contact your 24/7 Enterprise Desk`
  - Executive Pass Modal:
    - Title: `Executive Pass` | Close icon
    - QR code SVG illustration
    - Passenger name: `Aarav Sharma`
    - Seat and fleet: `Seat 2A • Volvo 9600 Multi-Axle`
    - Badge: `Authorized Corporate Roster`
    - Button: `Done`
  - Toast: `Pass link copied to clipboard` / `All 5 passes queued for batch dispatch` / `Downloading GST Invoice #TM-CORP-8821.pdf`
- **User inputs:** None (modal interactions).
- **Buttons and links:**
  - `Ticket` button per passenger → Opens `#ticketModal` preview
  - `content_copy` button per passenger → Copies ticket pass URL to clipboard
  - `Assign +` button → Opens assignment for remaining 23 team passes
  - `Share All Tickets` CTA button → Dispatches all 5 passes via WhatsApp & Email
  - `Download GST Invoice & Roster (PDF)` CTA button → Downloads invoice PDF
  - `Contact your 24/7 Enterprise Desk` link
- **Navigation:**
  - **Before:** `select_your_bus_seating`
  - **After:** None (terminal screen); modal preview on-page

---

## A. Entities Seen Across Screens

| Entity | Fields Seen Across Screens | Example Values from Stitch Exports |
|---|---|---|
| **destination** | `id`, `slug`, `name`, `region`, `tagline`, `description`, `hero_image_path`, `starting_price`, `rating`, `review_count`, `duration_recommendation`, `best_season`, `urgency_badge`, `verified_badge`, `highlights` (title, duration, category, badge, entry_type), `composition_items` (stay, vehicle, meals, guarantee) | `Jaipur`, `Rajasthan`, `"The Pink City • 3-5 days recommended"`, `"Palaces, bustling bazaars, and royal heritage..."`, `₹12,499 / person`, rating: `4.8`, review count: `3.2k`, best season: `Oct–Mar`, highlights: `"Hawa Mahal & Old City Walk"`, `"Amber Palace & Elephant Route"` |
| **hotel** | `id`, `name`, `neighborhood` / `location_detail`, `distance_from_center`, `star_rating`, `review_count`, `amenities` (text array), `price_per_night`, `subtotal` / `total_for_stay`, `stay_nights`, `guest_count`, `scarcity_badge`, `wishlist_state`, `image_paths`, `room_type` | `Shahpura Haveli & Heritage Suites`, `Bani Park (1.8 km from center)`, `4.8`, `840 reviews`, `₹4,200 / night`, `₹12,600 for 3 nights • incl. taxes`, `["Free Breakfast", "Heritage Courtyard", "Free WiFi"]`, badge: `"Only 2 rooms left"`, room: `"Royal Suite"` |
| **vehicle** | `id`, `name`, `type` (`car`, `bike`, `bus`), `category`, `fleet_tier`, `capacity` (seats), `luggage_capacity`, `specs_tags` (climate control, helmets, wifi, etc.), `driver_type` (`Pro Chauffeur`, `Uniformed Driver`, `Self Drive`), `fuel_toll_policy`, `rating`, `pricing_unit` (`per_day`), `unit_price`, `total_price`, `urgency_badge`, `assigned_driver_name`, `assigned_driver_phone`, `license_plate`, `driver_rating` | `Maruti Suzuki Dzire`, `AC Sedan`, `4 Seater`, `2 Bags`, `Climate Control`, `₹1,899 / day`, `Total: ₹7,596 (4 days)`, driver: `"Rajesh Kumar"`, phone: `"+91 98765 43210"`, plate: `"DL 1Y AA 4088"`, rating: `"4.96 ★"` |
| **stop** | `id`, `name`, `destination_id`, `route_marker` / `distance_from_origin`, `highway`, `description`, `highlights` / `amenities`, `urgency_badge`, `turnaround_time`, `price_type`, `extra_price`, `pricing_unit` | `Neemrana Fort-Palace`, `"122 km from Delhi (Approx. 2.5 hrs mark) • Highway direct access"`, `["Clean Washrooms", "Royal Buffet", "EV Fast Charger", "Day Pass or Overnight"]`, `"Day Pass from"`, `₹1,850 / person`, `"Quick 45m Turnaround"` |
| **itinerary_item** | `day_number`, `date_text`, `start_time`, `location_tag`, `title`, `description`, `duration_text`, `badge`, `assigned_person` / `resource` | Day 1, `Sunday, Dec 14`, `07:30 AM`, `DELHI NCR`, `"Private Chauffeur Pickup"`, `"Doorstep pickup in sanitized Toyota Innova Crysta..."`, `3h drive`, driver: `"Rajesh Kumar"`, historian: `"Dr. Arvind Rathore"`, table: `"Table 04 Reserved"` |
| **booking / trip** | `booking_reference`, `booking_kind`, `destination`, `start_date`, `end_date`, `total_days`, `nights`, `traveler_count`, `plan_type`, `status`, `line_items` (stay, transport, rest stop, fees, taxes, discount), `total_amount`, `price_lock_timer` | `#TM-JPR-9841`, `TM-JAIPUR-8829`, `normal`, `Jaipur`, `Nov 14, 2025` to `Nov 18, 2025`, `4D / 3N`, `2 Travelers`, `Confirmed & Paid`, `₹27,376`, timer: `"14:48"` |
| **commercial_booking** | `trip_id`, `company_name`, `booking_reference`, `route`, `start_date`, `end_date`, `total_days`, `nights`, `reporting_time`, `fleet_vehicle`, `headcount`, `exec_reserved_count`, `trip_purpose` / `cost_center`, `approval_status`, `total_corporate_package`, `per_traveler_cost` | `Acme Tech Pvt Ltd`, `TM-CORP-8821`, `"Delhi NCR ↔ Jaipur Heritage Circuit"`, `Nov 20 – Nov 24, 2025`, `5D • 4N`, `07:30 AM IST (Fleet at 07:00 AM)`, `Volvo 9600 Luxury Multi-Axle (45-Seater)`, `28 Passengers`, `5 Exec Reserved`, `"Engineering Offsite Q4 — Jaipur"`, `₹2,27,150`, `₹8,112.50 / traveler` |
| **passenger / ticket** | `full_name`, `phone`, `designation` / `role`, `employee_id`, `seat_number`, `vehicle_name`, `ticket_status`, `qr_code_data`, `share_link` | `Aarav Sharma`, `+91 98765 43210`, `VP Engineering`, `Employee #0412`, `Seat 2A`, `Volvo 9600 Multi-Axle`, `EXEC`, `Authorized Corporate Roster` |
| **invoice** | `invoice_reference`, `invoice_type`, `subtotal`, `tax_gst`, `discount`, `total_amount`, `itc_status`, `per_traveler_rate` | `TM-CORP-8821`, `Corporate Invoice`, Volvo coach (5 days @ ₹38,500/day): `₹1,92,500`, GST (18%): `₹34,650`, Total: `₹2,27,150`, `ITC QUALIFIED`, `₹8,112.50 / traveler` |
| **profile** | `full_name`, `email`, `phone`, `avatar_initials`, `membership_tier`, `level`, `trips_count`, `saved_spots_count`, `km_logged`, `company_name`, `corporate_role` | `Arjun Kapoor`, `arjun.kapoor@tripmate.io`, `+91 98101 23456`, `AK`, `Tripmate Explorer Tier` (68% to Voyager), `Level 2`, `14 Trips Taken`, `8 Saved Spots`, `4,850 KM Logged`, `Acme Tech Pvt Ltd` |

---

## B. Screens That Are Variants or Duplicates

There are three (3) distinct "Home" screens in the design exports:

1. **`home_destination_discovery`** (Default Discovery State):
   - Shows generic search bar placeholder `Where do you want to explore?`
   - Horizontal category filter chips (`Popular`, `Hidden Gems`, `Less Discovered`, `Nature`, `Heritage`, `Weekend Getaways`)
   - Section header: `India's Most Popular Destinations`
   - Renders 4 high-level destination cards: Jaipur (`From ₹12,499/person`), Udaipur (`From ₹14,800/person`), Munnar (`From ₹9,200/person`), and Hampi (`From ₹7,500/person`).
   - Cards display only destination name, tag, starting price, and `Plan This Trip` button. No rating, no duration pills, and no wishlist button.

2. **`home_search_filter_applied`** (Destination-Scoped Circuit Results State):
   - Search bar contains an active query: `Jaipur, Rajasthan` with a clear button.
   - Filter chips have icons (e.g. `Heritage` with castle icon).
   - Shows results counter (`4 Curated Trips in Jaipur`) and a sort dropdown menu (`Best Match`, `Duration`, `Price: Low`).
   - Renders 4 specific pre-packaged itineraries within Jaipur: `Jaipur Heritage & Forts Circuit` (4D/3N @ ₹12,499), `Amer & Nahargarh Valley Escape` (3D/2N @ ₹9,800), `Royal Artisans & Bazaars` (2D/1N @ ₹6,450), and `Samode Palace Luxury Retreat` (3D/2N @ ₹21,500).
   - Cards feature interactive wishlist heart buttons, numerical ratings (`★ 4.9`, `★ 4.8`, `★ 4.95`, `★ 5.0`), inclusion pills (`Heritage Havelis & Cab`), and detailed itinerary descriptions.

3. **`home_empty_state`** (Zero Results with Fallback Alternatives):
   - Search bar contains an unmatched query: `Spiti Offroad Winter` with clear button.
   - Active filter chips include date and budget: `Offbeat Snow Trails` (with close icon), `Dec - Feb`, `4x4 Expeditions`, `Budget ₹15k-₹30k`.
   - Displays empty illustration icon (`explore_off`), message `No destinations match this filter yet`, and two primary recovery buttons: `Clear all filters` and `Browse All Circuits`.
   - Below the empty state, it renders a `Trending Alternatives` grid featuring two recovery circuit cards (Jaipur Heritage Circuit @ ₹8,499 /person and Udaipur Lakeside Retreat @ ₹12,200 /person).

**Differences Summary:**
- `home_destination_discovery` is catalog-level destination browsing.
- `home_search_filter_applied` is circuit/package listing for a searched city with ratings, wishlist, and sorting.
- `home_empty_state` handles zero search results with recovery CTAs and fallback destination circuits.

---

## C. Normal-Booking Screen Order in Designs

The designs represent the normal booking user journey in the following concrete sequence:

1. `splash_screen` (App Launch)
2. `onboarding_flow` (3-slide value proposition)
3. `login_signup` (Authentication)
4. `home_destination_discovery` (or `home_search_filter_applied` / `home_empty_state`)
5. `destination_detail_jaipur` (Destination detail overview; tap `Plan This Trip`)
6. `trip_duration_selector` (Labeled as **Step 1 of 4**: selects duration chips, stepper, calendar date range Nov 14–18)
7. `hotel_selection` (Labeled as **Step 2 of 4: Stay**: selects Shahpura Haveli, Diggi Palace, or Alsisar Haveli)
8. `car_bike_rental_selection` (Labeled as **Step 2 of 4 • Jaipur Expedition** [duplicate step numbering in design]: selects Dzire, Innova, or Royal Enfield)
9. `mid_journey_rest_stop` (Highway rest stop step: selects Neemrana Fort-Palace or Highway King; has buttons `Skip Rest Stop` and `Continue to Review`)
10. `trip_itinerary_summary` (Itinerary timeline review; contains `Confirm & Book Trip` / `Confirm & Proceed` buttons)
11. `checkout_payment` (Order summary with GST, fees, coupon discount; UPI/card/EMI payment selection; `Confirm & Pay ₹27,376`)
12. `booking_confirmation` (Success confirmation screen with booking ref `TM-JAIPUR-8829`, PDF download, and `View Itinerary & Tickets`)
13. `trip_itinerary_summary` (Post-booking detailed schedule view) / `recent_trips` (My Trips tab)

*Note:* There is NO screen exported in the Stitch designs for the **Traveller Details Form** (name, phone, government-ID upload), even though it is specified in `FEATURES.md` §4.5 and required by `DATABASE.md` §6.

---

## D. CONFLICTS

Every discrepancy where a screen shows a field, state, or step that `DATABASE.md`, `FEATURES.md`, or `FLOWS.md` does not cover, contradicts, or lacks.

---

### Conflict 1: Missing Traveller Details Form Screen
- **Screen side (`Tripmate_screens`):**
  There is NO exported screen for the traveller details form. The normal booking flow jumps directly from `mid_journey_rest_stop` / `trip_itinerary_summary` to `checkout_payment`.
- **Specification side (`FEATURES.md` §4.5, `FLOWS.md` §1 & §2, `DATABASE.md` §6):**
  - `FEATURES.md` §4.5: *"4.5 Traveller details form [CONFIRMED requirement] Appears after the plan (hotel/vehicle/stops) is chosen, before checkout. One block per traveller... full name (required), phone (required for lead, optional others), ID type (dropdown), ID document upload... Gate: Continue is disabled until passenger rows = traveler_count".*
  - `FLOWS.md` §1: Route `/book/[tripId]/travellers` sits between `/stops` and `/checkout`.
  - `DATABASE.md` §6 (`demo_pay`): *"Caller must own the trip; trip must be... draft, with start_date, end_date, >=1 trip_passengers row, and traveler_count matching passenger count."*
- **Database gap:** Missing from DATABASE.md: Screen exists in spec but is completely absent from Stitch design exports.

---

### Conflict 2: Commercial Bus Pricing — Per-Day Charter vs Per-Seat Pricing
- **Screen side (`select_your_bus_seating` & `commercial_booking_confirmed`):**
  - `select_your_bus_seating` line 62–64: `Charter Rate ₹38,500 / day`, `Total Estimated Charter (3 Days) ₹1,15,500`.
  - `commercial_booking_confirmed` line 229–230: `Volvo Luxury Coach (5 Days @ ₹38,500/day): ₹1,92,500`.
  - Buses are billed as whole-vehicle daily charters (`price_per_day * days`).
- **Specification side (`DATABASE.md` §2 line 103, §3 line 165, `FEATURES.md` §9.3):**
  - `DATABASE.md` §2: `CHECKs: type='bus' => pricing_unit='per_seat' AND capacity IS NOT NULL`.
  - `DATABASE.md` §3 (`trip_vehicles.subtotal`): `per_seat => unit_price * seats`.
  - `FEATURES.md` §9.3: *"writes trip_vehicles(vehicle_id, seats=traveler_count)"*.
- **Database gap:** Missing from DATABASE.md: `vehicles.pricing_unit` cannot support `per_day` for buses under the existing constraint; missing `vehicles.charter_rate_per_day` or relaxing `type='bus'` constraint to allow `pricing_unit='per_day'`.

---

### Conflict 3: Commercial Partial Seat/Passenger Assignment
- **Screen side (`commercial_booking_confirmed` line 114, 217):**
  The confirmed commercial booking explicitly states:
  - Header badge: `5 OF 28 ISSUED`
  - Subtitle: `5 Executive passes issued • Centralized QR boarding enabled`
  - Notice block: `23 Regular team passes pending assignment` with an `Assign +` button.
  Only 5 passengers out of 28 have been assigned seats and issued passes at the time of confirmed booking.
- **Specification side (`DATABASE.md` §6 line 345, `FLOWS.md` §2 line 81, `BUILD_PLAN.md` M7):**
  - `DATABASE.md` §6 (`submit_commercial_booking`): *"Validates: traveler_count = passenger rows; each passenger has seat_number; seats <= bus capacity"*.
  - `FLOWS.md` §2: `"/commercial/*/review requires: trip_vehicles bus row; passengers with seats = traveler_count"`.
  - `BUILD_PLAN.md` M7: *"Continue disabled until all seats assigned"*.
- **Database gap:** Missing from DATABASE.md: RPC function `submit_commercial_booking` does not allow partial passenger rosters (`traveler_count > count(trip_passengers)`), and database lacks a partial assignment status or post-booking assignment capability.

---

### Conflict 4: Commercial Setup Missing Origin & Destination Inputs
- **Screen side (`set_up_your_commercial_trip`):**
  Step 1 of commercial setup displays:
  - Section 1: `Number of Travelers` (stepper)
  - Section 2: `Trip Duration & Dates` (start date and end date)
  - Section 3: `Departure Time` (time display & presets)
  - Section 4: `Trip Purpose / Event Name` (text input)
  There is NO input field on this screen for origin location or destination location!
- **Specification side (`FEATURES.md` §9.2 line 101, `DATABASE.md` §3 lines 129–130, `FLOWS.md` §1):**
  - `FEATURES.md` §9.2: *"Set Up (step 1): Number of travellers, dates, preferred time, purpose. Writes trips.traveler_count, start_date, end_date, title/from_location/to_location per design..."*
  - `DATABASE.md` §3: `trips.from_location` (`free text; used by commercial`), `trips.to_location` (`free text; used by commercial`).
- **Database gap:** Missing from DATABASE.md: Design fails to collect `from_location` and `to_location` on screen, although the confirmed screen later magically displays `Delhi NCR ↔ Jaipur Heritage Circuit`.

---

### Conflict 5: Checkout Shows Live Payment Gateways & Lacks "Demo Mode" Notice
- **Screen side (`checkout_payment`):**
  - Displays interactive UPI ID input with `Verify` button, and app shortcuts (`GPay`, `PhonePe`, `Paytm`).
  - Displays `Credit / Debit Card` (with `VISA`, `MC`, `RuPay` badges).
  - Displays `Net Banking` (HDFC, ICICI, SBI, Axis, Kotak and 50+ banks).
  - Displays `EMI / Pay Later` (0% EMI, `₹2,281/mo`).
  - Displays `256-Bit Bank Grade SSL Encryption • 100% Refundable per Policy`.
  - There is NO "Demo mode" notice or badge anywhere on the screen.
- **Specification side (`FEATURES.md` §4.6 line 61, `AGENTS.md` §2 line 39, `CONVENTIONS.md` §7 line 86):**
  - `FEATURES.md` §4.6: *"A visible 'Demo mode — no real payment' note must appear."*
  - `AGENTS.md` §2: *"DEMO MODE ONLY. No real gateway, no Stripe, no Razorpay code."*
  - `CONVENTIONS.md` §7: *"Show the 'Demo mode' notice in Checkout whenever provider.id === 'demo'."*
- **Database gap:** Missing from DATABASE.md: No schema gap, but severe UI contradiction. Design shows production payment options and security claims without the mandatory Demo Mode disclaimer.

---

### Conflict 6: Checkout Bill Markup (Assistance Fees, GST Markup, Discounts)
- **Screen side (`checkout_payment` lines 58–76):**
  Trip summary breakdown includes:
  - `Tripmate Assistance & Fees`: `₹999`
  - `Taxes & GST (18%)`: `₹4,481`
  - `EXPLOREINDIA APPLIED`: `- ₹2,000` (discount coupon)
  - Resulting Total: `₹27,376`
- **Specification side (`DATABASE.md` §3 line 136, §4 line 248, §6 line 334):**
  - `DATABASE.md` §3: `trips.total_amount`: *"default 0; server-computed only"*.
  - `DATABASE.md` §6 (`recalc_trip_total`): *"set trips.total_amount = sum of all child subtotals/prices for that trip"*.
  - There is NO assistance fee column or child table in the database schema.
  - There is NO coupon or promo discount table or column in `trips`.
  - In `DATABASE.md`, taxes are not added on top of `total_amount` to form a new total; `trips.total_amount` is strictly the sum of `trip_hotels`, `trip_vehicles`, and `trip_stops`.
- **Database gap:** Missing from DATABASE.md: `trips.assistance_fee`, `trips.tax_amount`, `coupons` table, `trips.coupon_id`, `trips.discount_amount`.

---

### Conflict 7: Non-Rajasthan Destinations in Catalog
- **Screen side (`home_destination_discovery`, `home_search_filter_applied`, `home_empty_state`, `recent_trips`, `profile`):**
  - `home_destination_discovery`: Renders `Munnar` (Kerala) and `Hampi` (Karnataka).
  - `home_empty_state`: User query searches for `Spiti Offroad Winter` (Himachal Pradesh).
  - `recent_trips`: Completed Trip 3 is `Munnar Misty Hills Escape` (Kerala).
  - `profile`: Last completed journey is `Coorg Highland Expedition` (Karnataka).
- **Specification side (`AGENTS.md` §1 lines 28–29):**
  - `AGENTS.md` §1: *"Destination content in the designs is Rajasthan-focused (Jaipur, Udaipur, etc.). Do not assume other regions or flights/trains — those are out of scope."*
  - `DATABASE.md` §8: *"Destinations shown in the designs (Jaipur, Udaipur first)... Do not invent extra destinations or hotels beyond what the designs show."*
- **Database gap:** Missing from DATABASE.md: `destinations` seed data in `DATABASE.md` §8 only mentions Rajasthan (Jaipur, Udaipur), but the UI designs contain Munnar, Hampi, Coorg, and Spiti.

---

### Conflict 8: Cancellation Refund Policy Discrepancy
- **Screen side (`destination_detail_jaipur` line 96, `trip_duration_selector` line 209, `trip_itinerary_summary` line 297):**
  - `destination_detail_jaipur`: *"Free cancellation up to 48 hours prior to departure date."*
  - `trip_duration_selector`: *"Free date changes up to 48 hrs before departure"*
  - `trip_itinerary_summary`: *"Free modification or cancellation up to 48 hours prior to trip."*
  (This implies a 100% refund up to 48 hours before departure).
- **Specification side (`DATABASE.md` §6 line 351–352, `FEATURES.md` §8 line 88):**
  - `DATABASE.md` §6 (`cancel_booking`): *"DEMO refund rule [ASSUMED]: days_before = start_date - current_date; >= 7 => 100% of total_amount; 2–6 => 50%; < 2 => 0%."*
- **Database gap:** Missing from DATABASE.md: RPC function `cancel_booking` rule contradicts the 48-hour 100% refund policy displayed across multiple screens.

---

### Conflict 9: Wishlist & Saved Spots Functionality
- **Screen side (`home_search_filter_applied`, `destination_detail_jaipur`, `hotel_selection`, `profile`):**
  - Interactive wishlist heart buttons on destination cards in `home_search_filter_applied`.
  - Bookmark button (`bookmarkBtn`) on `destination_detail_jaipur`.
  - Wishlist button on every hotel card in `hotel_selection`.
  - Profile screen displays `8 Saved Spots` metric, and menu item `Saved Destinations (8 destinations bookmarked)`.
- **Specification side (`DATABASE.md` §9 line 382):**
  - `DATABASE.md` §9: *"Deliberately NOT in v1: ... wishlist;".*
- **Database gap:** Missing from DATABASE.md: `user_wishlists` or `saved_destinations` table; `profiles.saved_spots_count`.

---

### Conflict 10: Authentication Channels at Login/Signup
- **Screen side (`login_signup` lines 44, 82, 106):**
  - Input field label: `Phone number or Email` (placeholder: `Enter mobile or email`).
  - Social authentication button: `Instant OTP via WhatsApp` (with `Fast` badge).
  - Social authentication button: `Continue with Apple`.
- **Specification side (`AGENTS.md` §2 line 38, `FEATURES.md` §1 line 12, 15):**
  - `AGENTS.md` §2: *"Auth: Supabase Auth: Google sign-in + email/password. No phone OTP."*
  - `FEATURES.md` §1: *"Google sign-in and email/password (Supabase Auth)... Phone number is not collected at login."*
  - `DATABASE.md` §1 (`profiles.phone`): *"collected in traveller/booking form, not at login"*.
- **Database gap:** Missing from DATABASE.md: Phone-based auth/WhatsApp OTP provider and Apple OAuth provider not supported in v1 specification.

---

### Conflict 11: Destination Entity Catalog Schema Gaps
- **Screen side (`destination_detail_jaipur` & `home_search_filter_applied`):**
  Displays rich destination metadata:
  - Numerical rating: `4.8` (Jaipur), `4.9`, `4.95`, `5.0`
  - Review tally: `(3.2k)`
  - Recommended duration: `3–4 Days`, `3-5 days recommended`
  - Recommended season: `Oct–Mar`
  - Highlights / Sightseeing list: `4 highlights` (Hawa Mahal, Amber Palace, Nahargarh, Johari Bazaar), each with title, duration (`2.5 hrs`), category (`Heritage`), and tag (`Must Visit`).
- **Specification side (`DATABASE.md` §2 lines 66–78, §9 line 382):**
  - `destinations` table has only: `id`, `slug`, `name`, `region`, `tagline`, `description`, `hero_image_path`, `starting_price`, `is_featured`, `is_active`.
  - `DATABASE.md` §9: *"Deliberately NOT in v1: ... activities catalog."*
- **Database gap:** Missing from DATABASE.md: `destinations.rating`, `destinations.review_count`, `destinations.recommended_days`, `destinations.best_season`, `destination_highlights` (or activities table).

---

### Conflict 12: Hotel Entity Catalog Schema Gaps
- **Screen side (`hotel_selection`):**
  Displays hotel metadata:
  - Review counts: `(840 reviews)`, `(1,210 reviews)`, `(620 reviews)`
  - Location distance: `Bani Park (1.8 km from center)`, `C-Scheme, Jaipur`, `Sansar Chandra Road`
  - Scarcity / Marketing badges: `Only 2 rooms left`, `Selling fast for Nov`, `Top Rated Haveli`
  - Room type: `Royal Suite`, `Deluxe Courtyard`
- **Specification side (`DATABASE.md` §2 lines 79–90):**
  - `hotels` table has only: `id`, `destination_id`, `name`, `description`, `star_rating`, `price_per_night`, `image_paths`, `amenities`, `is_active`.
- **Database gap:** Missing from DATABASE.md: `hotels.review_count`, `hotels.location_detail`, `hotels.distance_km`, `hotels.badge`.

---

### Conflict 13: Vehicle Entity Catalog & Driver Details Schema Gaps
- **Screen side (`car_bike_rental_selection`, `booking_confirmation`, `trip_itinerary_summary`):**
  - Luggage capacity: `2 Bags`, `4 Large Bags`
  - Features / Equipment: `Climate Control`, `2 Helmets Provided`, `On-board WiFi`, `Unlimited KM`
  - Service type: `Pro Chauffeur`, `Uniformed Driver`, `Self Drive`
  - Fuel/toll policy: `Fuel & toll taxes covered up to 300 km`, `Intercity permit included`
  - Numerical rating: `4.9`, `4.96`
  - Assigned driver details: `Rajesh Kumar`, phone `+91 98765 43210`, license plate `DL 1Y AA 4088`, driver rating `4.96 ★ (180+ trips)`.
- **Specification side (`DATABASE.md` §2 lines 91–104, §3 lines 156–166):**
  - `vehicles` table has only: `id`, `type`, `name`, `description`, `capacity`, `price`, `pricing_unit`, `image_path`, `is_active`.
  - Neither `trips` nor `trip_vehicles` stores driver name, phone, vehicle plate number, or driver rating.
- **Database gap:** Missing from DATABASE.md: `vehicles.luggage_capacity`, `vehicles.features`, `vehicles.fuel_policy`, `trip_vehicles.driver_name`, `trip_vehicles.driver_phone`, `trip_vehicles.vehicle_plate_number`.

---

### Conflict 14: Mid-Journey Stops Schema Gaps & Pricing Model
- **Screen side (`mid_journey_rest_stop`):**
  - Distance markers: `122 km from Delhi (Approx. 2.5 hrs mark)`, `158 km from Delhi (Approx. 3.2 hrs mark)`
  - Highway access tag: `NH48 Express Bay`, `Highway direct access`
  - Turnaround time: `Quick 45m Turnaround`
  - Amenity tags: `Clean Washrooms`, `EV Fast Charger`, `Kids Play Area`, `Royal Buffet`
  - Pricing format: `Day Pass from ₹1,850 / person`, `Meal & Lounge Access ₹499 / person` (charged per person!).
- **Specification side (`DATABASE.md` §2 lines 105–115, §3 line 174):**
  - `stops` table has only: `id`, `destination_id`, `name`, `description`, `location_text`, `image_path`, `extra_price`, `is_active`.
  - In `DATABASE.md`, `stops.extra_price` is a flat fee added to the trip, not multiplied by `traveler_count`.
- **Database gap:** Missing from DATABASE.md: `stops.distance_km`, `stops.amenities`, `stops.pricing_unit` (`per_person` vs flat).

---

### Conflict 15: Itinerary Items Detail Level vs v1 Schema
- **Screen side (`trip_itinerary_summary`):**
  - Shows 5 scheduled daily events with exact times (`07:30 AM`, `10:30 AM`, `01:30 PM`, `04:00 PM`, `07:30 PM`).
  - Shows external guides and private access: `Private Historian: Dr. Arvind Rathore`, inner palace chamber passes, rooftop table reservations (`Table 04 Reserved`).
- **Specification side (`DATABASE.md` §3 lines 195–212):**
  - `itinerary_items`: `day_number`, `sort_order`, `item_type`, `title`, `description`, `start_time`, `trip_hotel_id`, `trip_vehicle_id`, `trip_stop_id`.
  - Line 211: *"v1 generates only hotel, vehicle, stop items. activity/note are reserved until an activities source is defined (open item)."*
- **Database gap:** Missing from DATABASE.md: No table exists to store or generate sightseeing activities, historians, meals, or reservations.

---

### Conflict 16: Profile Gamification & Travel Preferences
- **Screen side (`profile`):**
  - Shows user level: `Level 2`
  - Shows loyalty progress: `Tripmate Explorer Tier` (with progress bar `3 trips to Voyager`)
  - Shows total travel distance: `4,850 KM Logged`
  - Shows total trips: `14 Trips Taken`
  - Menu item: `Trip Preferences` (`Stays, vehicle types, rest stop preferences`)
  - Menu item: `Payment Methods` (`2 UPI IDs, 1 Saved Card`)
- **Specification side (`DATABASE.md` §1 lines 26–36, §9 line 382):**
  - `profiles` table has only: `id`, `full_name`, `email`, `phone`, `avatar_url`.
  - `DATABASE.md` §9: *"Deliberately NOT in v1: ... travel_preferences;"*.
- **Database gap:** Missing from DATABASE.md: `profiles.level`, `profiles.loyalty_tier`, `profiles.km_logged`, `travel_preferences` table, `saved_payment_methods` table.

---

### Conflict 17: Commercial Past Bookings List on Intro Screen
- **Screen side (`b2b_commercial_trip_intro_overview`):**
  - Shows only a static marketing page with cards and a text button `View Past Bookings`. No list of bookings is rendered.
- **Specification side (`FEATURES.md` §9.1 lines 95–97):**
  - `FEATURES.md` §9.1: *"Hero, highlights, 'how it works', past commercial bookings list (company-scoped: all bookings for the user's company, with approval/status chips such as pending review / accepted & booked as shown in the design)."*
- **Database gap:** Missing from DATABASE.md: Screen in Stitch exports does not render the company bookings list specified in `FEATURES.md`.

---

### Conflict 18: Booking Reference Code Naming Convention
- **Screen side (`checkout_payment`, `booking_confirmation`, `commercial_booking_confirmed`):**
  - Checkout: `#TM-JPR-9841`
  - Confirmation: `TM-JAIPUR-8829`
  - Commercial Confirmation: `TM-CORP-8821`
- **Specification side (`DATABASE.md` §3 line 123):**
  - `DATABASE.md` §3: `booking_ref text not null unique default generate_booking_ref() -> 'TMT-' + 6 digits` (e.g. `'TMT-123456'`).
- **Database gap:** Missing from DATABASE.md: Schema function produces `'TMT-XXXXXX'`, whereas designs show city/kind codes (`TM-JPR-`, `TM-JAIPUR-`, `TM-CORP-`).

---

### Conflict 19: Recent Trips Status Filter Categories
- **Screen side (`recent_trips` lines 18–25):**
  - Renders only three filter chips: `All Trips (3)`, `Upcoming (1)`, `Completed (2)`.
- **Specification side (`DATABASE.md` §3 line 143, `FEATURES.md` §5 line 71–72):**
  - `DATABASE.md` §3 & `FEATURES.md` §5: Derived statuses are `upcoming`, `ongoing`, `completed`, and `cancelled`.
  - Designs lack `Ongoing` and `Cancelled` tabs.
- **Database gap:** Missing from DATABASE.md: UI designs do not provide views or filters for `ongoing` or `cancelled` trips.

---

### Conflict 20: Normal Booking Step Count and Numbering
- **Screen side (`trip_duration_selector`, `hotel_selection`, `car_bike_rental_selection`):**
  - Duration selector indicates: `Step 1 of 4 • Itinerary Horizon`
  - Hotel selection indicates: `Step 2 of 4: Stay`
  - Car & Bike rental indicates: `Step 2 of 4 • Jaipur Expedition` (Duplicate step number!)
- **Specification side (`FLOWS.md` §1 lines 34–44):**
  - `FLOWS.md` defines a 6-step normal booking flow:
    1. Duration (`/duration`)
    2. Hotel (`/hotel`)
    3. Vehicle (`/vehicle`)
    4. Stops (`/stops`)
    5. Travellers (`/travellers`)
    6. Checkout (`/checkout`)
- **Database gap:** Missing from DATABASE.md: Design step indicator counts (4 steps) contradict the engineering specification flow (6 steps).

---

## E. Unreadable or Ambiguous Items

1. **Price Discrepancy on Trip Itinerary Summary (`trip_itinerary_summary`):**
   - In the card breakdown (line 290), the Grand Total is clearly rendered as `₹27,376` (`₹13,688 / person for 2 guests`).
   - In the fixed bottom sheet (line 339), the Total Estimate is rendered as `₹1,420 / 2 guests` (`₹1,420`).
   - It is ambiguous which calculation is intended, or whether `₹1,420` was an un-updated placeholder in the Stitch export.

2. **Dual Identity of `trip_itinerary_summary` (Pre-Booking Review vs Post-Booking Itinerary):**
   - The screen title is `Trip Itinerary` and contains confirmed details such as `Table 04 Reserved`, `VIP Pass`, and assigned historian.
   - However, the screen also includes booking conversion buttons: `Confirm & Book Trip`, `Customize Stops / Edit Days`, and a bottom drawer with `Confirm & Proceed` (lock icon).
   - It is ambiguous whether this screen serves as a pre-checkout order review screen or the post-booking detail view (`/trips/[tripId]`).

3. **Absence of Traveller Details Form in Normal Flow:**
   - How and where are traveller full names, phone numbers, and sensitive government-ID documents collected if no screen exists in the Stitch exports?
   - `FEATURES.md` §4.5 states it appears between stops and checkout, but `mid_journey_rest_stop` has a button labeled `Continue to Review`, pointing directly to `trip_itinerary_summary`.

4. **Missing Dedicated Invoice View Screen:**
   - Both `recent_trips` (`View Invoice & Rebook`) and `FLOWS.md` (`/trips/[tripId]/invoice`) reference an invoice view, but no dedicated `trip_invoice` screen exists in the Stitch exports.

5. **Company Employee Directory in Commercial Seat Assignment:**
   - In `select_your_bus_seating`, selecting a seat automatically displays company employee names, designations, and employee IDs (`Aarav Sharma • VP Engineering • Employee #0412`).
   - The design shows an action `+ Assign Travellers 4 & 5 (Tap available seats 3B, 4A, or pick from directory)`. How this directory is queried or selected is not depicted in any screen.

6. **Ticket Modal vs Standalone Ticket Page:**
   - `commercial_booking_confirmed` renders passenger tickets in an inline HTML modal (`#ticketModal`) containing a QR code.
   - `FLOWS.md` and `FEATURES.md` §9.6 specify a standalone route `/tickets/[ticketCode]`. It is ambiguous whether the ticket should be an in-app modal or a distinct route.
