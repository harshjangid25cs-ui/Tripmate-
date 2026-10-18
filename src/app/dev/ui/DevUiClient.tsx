"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { StatusChip, type StatusType } from "@/components/ui/status-chip";
import { StepIndicator } from "@/components/ui/step-indicator";
import { SeatGrid } from "@/components/ui/seat-grid";
import { TicketTable, type TicketPassenger } from "@/components/ui/ticket-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Stepper } from "@/components/ui/stepper";
import { BottomNav, type NavTabId } from "@/components/ui/bottom-nav";
import { formatCurrency, formatDateRange } from "@/lib/format";

export default function DevUiClient() {
  // Interactive demo states
  const [currentStep, setCurrentStep] = React.useState(2);
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>(["2A", "2B", "3A"]);
  const [activeChipTab, setActiveChipTab] = React.useState("all");
  const [activeSegmentedTab, setActiveSegmentedTab] = React.useState("login");
  const [stepperVal, setStepperVal] = React.useState(4);
  const [navTab, setNavTab] = React.useState<NavTabId>("home");

  const normalSteps = [
    { id: 1, label: "Duration", description: "Select days & dates" },
    { id: 2, label: "Hotel", description: "Pick boutique stay" },
    { id: 3, label: "Vehicle", description: "Choose car or bike" },
    { id: 4, label: "Stops", description: "Highway rest midway" },
  ];

  const commercialSteps = [
    { id: 1, label: "Set Up", description: "Route & headcount" },
    { id: 2, label: "Bus Seating", description: "Fleet & seat selection" },
    { id: 3, label: "Confirmation", description: "Roster & passes" },
  ];

  const demoPassengers: TicketPassenger[] = [
    {
      id: "p1",
      name: "Aarav Sharma",
      role: "EXEC",
      seatNumber: "2A",
      phone: "+91 98765 43210",
      ticketCode: "TM-COMM-8910-A",
      isIssued: true,
    },
    {
      id: "p2",
      name: "Priya Nair",
      role: "EXEC",
      seatNumber: "2B",
      phone: "+91 98765 43211",
      ticketCode: "TM-COMM-8910-B",
      isIssued: true,
    },
    {
      id: "p3",
      name: "Vikram Malhotra",
      role: "TEAM",
      seatNumber: "3A",
      phone: "+91 98765 43212",
      ticketCode: "TM-COMM-8910-C",
      isIssued: true,
    },
    {
      id: "p4",
      seatNumber: "3B",
      isIssued: false,
    },
    {
      id: "p5",
      seatNumber: "3C",
      isIssued: false,
    },
  ];

  const handleSeatToggle = (seatId: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const allStatuses: StatusType[] = [
    "draft",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "pending_approval",
    "approved",
    "rejected",
  ];

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Dev Header */}
      <header className="sticky top-0 z-40 border-b border-border-hairline bg-white/95 px-6 py-4 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-text-primary">
              TripMate Design System Kitchen Sink
            </h1>
            <p className="font-body-sm text-text-secondary">
              Canonical tokens, components, and interactive specs (CONVENTIONS.md &amp; DECISIONS.md)
            </p>
          </div>
          <Badge variant="dark" size="sm">
            M0 Acceptance
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-12">
        {/* Section 1: Buttons */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">1. Buttons</h2>
            <p className="font-body-sm text-text-secondary">
              Strict flat fills and borders. Primary red (#E11D2E) reserved for primary actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Plan This Trip</Button>
            <Button variant="secondary">Preview Stays</Button>
            <Button variant="outline">View All Stays</Button>
            <Button variant="dark">Corporate Portal</Button>
            <Button variant="amber">Book Now (Fast)</Button>
            <Button variant="danger">Cancel Booking</Button>
            <Button variant="ghost">Skip</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm" variant="primary">Small (sm)</Button>
            <Button size="md" variant="primary">Medium (md)</Button>
            <Button size="lg" variant="primary">Large (lg)</Button>
            <Button size="icon" variant="secondary" aria-label="Search">
              🔍
            </Button>
            <Button loading variant="primary">Loading State</Button>
            <Button disabled variant="primary">Disabled</Button>
          </div>
        </section>

        {/* Section 2: Cards */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">2. Cards &amp; Elevation</h2>
            <p className="font-body-sm text-text-secondary">
              Sharp 16px radius, hairline borders (#E5E3DF), white surface. No blurry multi-tier shadows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="urgency" size="sm">Only 2 rooms left</Badge>
                  <span className="font-title-md text-text-primary">{formatCurrency(4200)}/night</span>
                </div>
                <CardTitle className="mt-2">The Raj Palace</CardTitle>
                <CardDescription>Boutique Heritage Stay • Amer Road, Jaipur</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-body-md text-text-primary">
                  Standard inventory card with hairline border and pure white background.
                </p>
              </CardContent>
              <CardFooter className="justify-between border-t border-border-hairline pt-3">
                <span className="text-body-sm text-text-secondary">4.8 ★ (240 reviews)</span>
                <Button size="sm" variant="primary">Select Room</Button>
              </CardFooter>
            </Card>

            <Card variant="interactive">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">Curated Road Circuit</Badge>
                  <span className="font-title-md text-text-primary">{formatCurrency(27376)}</span>
                </div>
                <CardTitle className="mt-2">Golden Triangle Express</CardTitle>
                <CardDescription>{formatDateRange("2025-12-14", "2025-12-17", { includeDuration: true })}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-body-md text-text-primary">
                  Interactive card with subtle hover micro-elevation and scale transition.
                </p>
              </CardContent>
              <CardFooter className="justify-between border-t border-border-hairline pt-3">
                <span className="text-body-sm text-text-secondary">Chauffeur + 4-Star Stay</span>
                <Button size="sm" variant="secondary">View Itinerary</Button>
              </CardFooter>
            </Card>

            <Card variant="glass" className="p-space-md">
              <h3 className="font-title-md text-text-primary">Controlled Frosted Glass Token</h3>
              <p className="font-body-sm text-text-secondary mt-1">
                Restricted strictly to floating search filters, itinerary drawer sheets, and navigation.
              </p>
            </Card>

            <Card variant="dark" className="p-space-md">
              <h3 className="font-title-md text-white">Dark Surface Container (#14151A)</h3>
              <p className="font-body-sm text-white/80 mt-1">
                Deployed for splash screen, immersive media headers, and corporate banners.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 3: Status Chips */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">3. Status Chips (Unified Color Map)</h2>
            <p className="font-body-sm text-text-secondary">
              Centralized color mapping per CONVENTIONS.md §6 covering trips, commercial approvals, payments, tickets, and scarcity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {allStatuses.map((status) => (
              <StatusChip key={status} status={status} />
            ))}
          </div>
        </section>

        {/* Section 4: Step Indicators */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">4. Step Indicators</h2>
            <p className="font-body-sm text-text-secondary">
              Normal booking flow (4 steps per DECISIONS.md D19) and Commercial flow (3 steps).
            </p>
          </div>

          <div className="flex flex-col gap-6 bg-card-surface border border-border-hairline rounded-2xl p-space-md shadow-sm">
            <div>
              <span className="font-title-md text-text-primary block mb-3">Normal Booking Builder</span>
              <StepIndicator
                steps={normalSteps}
                currentStep={currentStep}
                flowName="Trip Builder"
                variant="segments"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border-hairline">
              <span className="font-label-md text-text-secondary">Simulate Step:</span>
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCurrentStep(s)}
                  className={`h-8 w-8 rounded-lg font-bold text-label-md border transition-all ${
                    currentStep === s
                      ? "bg-primary-container text-white border-primary-container"
                      : "bg-surface text-text-primary border-border-hairline"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-border-hairline">
              <span className="font-title-md text-text-primary block mb-3">Commercial Booking Flow</span>
              <StepIndicator
                steps={commercialSteps}
                currentStep={2}
                flowName="B2B Commercial"
                variant="bullets"
              />
            </div>
          </div>
        </section>

        {/* Section 5: Bus Seat Grid */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">5. Commercial Bus Seat Grid</h2>
            <p className="font-body-sm text-text-secondary">
              Interactive 2+2 commercial bus cabin layout ported from select_your_bus_seating export.
            </p>
          </div>

          <div className="max-w-md">
            <SeatGrid
              rows={7}
              occupiedSeats={["1A", "1B", "1C", "1D", "5A", "5B", "5C", "5D"]}
              selectedSeats={selectedSeats}
              onSeatToggle={handleSeatToggle}
              maxSelectable={5}
            />
          </div>
        </section>

        {/* Section 6: Ticket Table */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">6. Ticket &amp; Passenger Table</h2>
            <p className="font-body-sm text-text-secondary">
              Passenger roster with ticket issuance states, boarding pass link, and assignment actions.
            </p>
          </div>

          <TicketTable
            passengers={demoPassengers}
            totalSeats={28}
            onViewTicket={(p) => alert(`Viewing boarding pass for ${p.name ?? p.seatNumber}`)}
            onCopyLink={(p) => alert(`Copied public ticket link for ${p.seatNumber}`)}
            onAssignPassenger={(p) => alert(`Assigning passenger to seat ${p.seatNumber}`)}
          />
        </section>

        {/* Section 7: Form Inputs & Stepper */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">7. Inputs, Steppers &amp; Badges</h2>
            <p className="font-body-sm text-text-secondary">
              Standardized 12px radius, 1.5px hairline borders, solid high-contrast focus rings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Aarav Sharma"
              required
              helperText="Enter name as per government photo ID"
            />

            <Input
              label="Work Email Address"
              placeholder="name@company.com"
              type="email"
              required
              defaultValue="aarav@tripmate.demo"
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              error="Valid 10-digit mobile number required"
            />

            <Input
              label="Disabled Input"
              placeholder="System assigned"
              disabled
              defaultValue="Jaipur, Rajasthan (Locked in v1)"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-space-md bg-card-surface border border-border-hairline rounded-2xl gap-4">
            <div>
              <span className="font-title-md text-text-primary block">Passenger Headcount Stepper</span>
              <span className="font-body-sm text-text-secondary">Number of travellers traveling together</span>
            </div>
            <Stepper
              value={stepperVal}
              onChange={setStepperVal}
              min={1}
              max={50}
            />
          </div>
        </section>

        {/* Section 8: Tabs & Filter Chips */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">8. Tabs &amp; Segmented Controls</h2>
            <p className="font-body-sm text-text-secondary">
              Trip filters (All, Upcoming, Completed, Cancelled per DECISIONS.md D17) and auth switches.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="font-label-md text-text-secondary block mb-2">Segmented Switcher (Auth Mode):</span>
              <div className="max-w-xs">
                <Tabs
                  variant="segmented"
                  items={[
                    { id: "login", label: "Log In" },
                    { id: "signup", label: "Sign Up" },
                  ]}
                  activeId={activeSegmentedTab}
                  onChange={setActiveSegmentedTab}
                />
              </div>
            </div>

            <div>
              <span className="font-label-md text-text-secondary block mb-2">Filter Chips (Recent Trips):</span>
              <Tabs
                variant="chips"
                items={[
                  { id: "all", label: "All Bookings", count: 8 },
                  { id: "upcoming", label: "Upcoming", count: 2 },
                  { id: "completed", label: "Completed", count: 5 },
                  { id: "cancelled", label: "Cancelled", count: 1 },
                ]}
                activeId={activeChipTab}
                onChange={setActiveChipTab}
              />
            </div>
          </div>
        </section>

        {/* Section 9: Floating Bottom Navigation */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-border-hairline pb-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">9. Floating Bottom Navigation</h2>
            <p className="font-body-sm text-text-secondary">
              Light Surface Glass token floating bar with 4 tabs: Home, Recent Trips, Commercial, Profile.
            </p>
          </div>

          <p className="font-body-sm text-text-secondary">
            Currently active tab: <strong className="text-text-primary">{navTab.toUpperCase()}</strong> (click tabs in the floating bar below to switch)
          </p>
        </section>
      </main>

      {/* Floating Bottom Nav */}
      <BottomNav activeTab={navTab} onChangeTab={setNavTab} />
    </div>
  );
}
