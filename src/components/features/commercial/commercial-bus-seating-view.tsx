"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  generateBusSeatGrid,
  type BusFleetItem,
  type CommercialDraftData,
  type CommercialRosterPassenger,
} from "@/lib/data/commercial-types";
import { getVehicleImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import {
  saveCommercialBusAndRosterAction,
  submitCommercialBookingAction,
} from "@/lib/actions/commercial";

interface CommercialBusSeatingViewProps {
  draft: CommercialDraftData;
  buses: BusFleetItem[];
}

export function CommercialBusSeatingView({
  draft,
  buses,
}: CommercialBusSeatingViewProps) {
  const router = useRouter();
  const { trip, selectedVehicle, passengers: initialPassengers } = draft;

  const totalDays = trip.total_days || 5;

  // Selected Bus (default to first bus or Volvo 9600)
  const initialBusId =
    selectedVehicle?.id || buses[0]?.id || "v4444444-4444-4444-4444-444444444444";
  const [selectedBusId, setSelectedBusId] = React.useState<string>(initialBusId);

  const activeBus =
    buses.find((b) => b.id === selectedBusId) || buses[0] || {
      id: initialBusId,
      name: "Volvo 9600 Multi-Axle Luxury Coach",
      subtitle: "45 Seater AC Semi-Sleeper • BS6 Phase 2",
      description: "",
      capacity: 45,
      luggageCapacity: 40,
      features: ["High-Speed Wi-Fi", "220V Outlets", "135° Recline", "Air Suspension"],
      pricePerDay: 38500,
      rating: 4.95,
      badge: "SELECTED VEHICLE",
      imagePath: null,
    };

  // Passenger Roster State (Pre-filled with Screen 19's 3 synced corporate leaders if none exist)
  const [roster, setRoster] = React.useState<CommercialRosterPassenger[]>(() => {
    if (initialPassengers && initialPassengers.length > 0) {
      return initialPassengers.map((p) => ({
        id: p.id,
        fullName: p.full_name,
        phone: p.phone || "+91 98765 43210",
        designation: p.designation || "Executive",
        employeeRef: p.employee_ref || "0000",
        seatLabel: p.seat_label || "2A",
        ticketCode: p.ticket_code,
        isLead: p.is_lead,
      }));
    }
    return [
      {
        fullName: "Aarav Sharma",
        phone: "+91 98765 43210",
        designation: "VP Engineering",
        employeeRef: "0412",
        seatLabel: "2A",
        isLead: true,
      },
      {
        fullName: "Priya Nair",
        phone: "+91 98112 34567",
        designation: "Lead Architect",
        employeeRef: "0789",
        seatLabel: "2B",
      },
      {
        fullName: "Rohan Verma",
        phone: "+91 99887 65432",
        designation: "Product Director",
        employeeRef: "0104",
        seatLabel: "3A",
      },
    ];
  });

  // Modal State for Adding/Editing Passenger
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [modalTargetSeat, setModalTargetSeat] = React.useState<string>("3B");
  const [modalName, setModalName] = React.useState("");
  const [modalPhone, setModalPhone] = React.useState("");
  const [modalDesignation, setModalDesignation] = React.useState("");
  const [modalEmpRef, setModalEmpRef] = React.useState("");

  // Submitting state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Selected and occupied seats calculation
  const assignedSeatLabels = roster.map((p) => p.seatLabel);

  // Generate seat grid for active bus capacity
  const seatGrid = React.useMemo(() => {
    return generateBusSeatGrid(activeBus.capacity, [], assignedSeatLabels);
  }, [activeBus.capacity, assignedSeatLabels]);

  // Total charter cost (D24: real days count * bus.pricePerDay)
  const totalCharterCost = totalDays * activeBus.pricePerDay;

  // Handle seat click
  const handleSeatClick = (seatLabel: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    const existing = roster.find((p) => p.seatLabel === seatLabel);
    if (existing) {
      // Edit existing
      setModalTargetSeat(existing.seatLabel);
      setModalName(existing.fullName);
      setModalPhone(existing.phone);
      setModalDesignation(existing.designation);
      setModalEmpRef(existing.employeeRef);
    } else {
      // New assignment
      setModalTargetSeat(seatLabel);
      setModalName("");
      setModalPhone("+91 98000 00000");
      setModalDesignation("Executive");
      setModalEmpRef(String(roster.length + 1).padStart(4, "0"));
    }
    setShowAddModal(true);
  };

  // Save modal passenger
  const handleSaveModalPassenger = () => {
    if (!modalName.trim()) {
      return;
    }

    setRoster((prev) => {
      const filtered = prev.filter((p) => p.seatLabel !== modalTargetSeat);
      return [
        ...filtered,
        {
          fullName: modalName.trim(),
          phone: modalPhone.trim() || "+91 98000 00000",
          designation: modalDesignation.trim() || "Executive",
          employeeRef: modalEmpRef.trim() || String(prev.length + 1).padStart(4, "0"),
          seatLabel: modalTargetSeat,
          isLead: filtered.length === 0,
        },
      ];
    });

    setShowAddModal(false);
  };

  // Remove passenger from roster
  const handleRemovePassenger = (seatLabel: string) => {
    setRoster((prev) => prev.filter((p) => p.seatLabel !== seatLabel));
  };

  // Submission handler
  const handleSubmitBooking = async () => {
    if (roster.length === 0) {
      setErrorMessage("Please assign at least 1 traveler to a seat before continuing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Step 1: Save Bus & Roster
    const saveRes = await saveCommercialBusAndRosterAction(
      trip.id,
      activeBus.id,
      roster.map((p) => ({
        fullName: p.fullName,
        phone: p.phone,
        designation: p.designation,
        employeeRef: p.employeeRef,
        seatLabel: p.seatLabel,
        isLead: p.isLead,
      }))
    );

    if (!saveRes.ok) {
      setErrorMessage(saveRes.error || "Failed to save passenger roster.");
      setIsSubmitting(false);
      return;
    }

    // Step 2: Submit Booking via RPC
    const submitRes = await submitCommercialBookingAction(trip.id);

    if (submitRes.ok) {
      router.push(`/commercial/${trip.id}/confirmed`);
    } else {
      setErrorMessage(submitRes.error || "Failed to submit commercial booking.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-xs">
            <Link
              href={`/commercial/${trip.id}/setup`}
              className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-all"
              aria-label="Back to setup"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
              M
            </div>
            <span className="font-title-md text-title-md text-text-primary font-bold hidden sm:inline-block">
              Tripmate
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-1 min-w-0 px-space-xs text-center">
            <h1 className="font-headline-sm text-sm font-bold text-text-primary truncate">
              Fleet &amp; Vehicle Selection
            </h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-container font-label-badge text-[9px] text-text-secondary font-bold uppercase tracking-wider shrink-0">
              B2B
            </span>
          </div>

          <div className="flex items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-margin-mobile pt-20 pb-36">
        <div className="flex flex-col gap-space-md">
          {/* Progress Strip */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-container text-on-primary font-label-badge text-[10px] font-bold">
                2
              </span>
              <span className="font-label-badge text-xs text-primary-container tracking-wider uppercase font-bold">
                Step 2 of 3
              </span>
            </div>
            <div
              aria-label="Step progress indicator"
              className="flex items-center gap-1.5"
            >
              <span className="w-6 h-1.5 rounded-full bg-primary-container" />
              <span className="w-6 h-1.5 rounded-full bg-primary-container" />
              <span className="w-6 h-1.5 rounded-full bg-surface-container-highest" />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Corporate Fleet Inventory Header */}
          <div className="flex items-baseline justify-between mt-1">
            <h2 className="font-headline-sm text-sm font-bold text-text-primary">
              Corporate Fleet Inventory
            </h2>
            <span className="font-label-md text-xs text-text-secondary">
              {buses.length} Options Available
            </span>
          </div>

          {/* Bus Cards Stack */}
          <div className="flex flex-col gap-3">
            {buses.map((bus) => {
              const isSelected = bus.id === selectedBusId;
              const busImage = getVehicleImageUrl(bus.name, bus.imagePath);

              return (
                <article
                  key={bus.id}
                  onClick={() => setSelectedBusId(bus.id)}
                  className={`w-full bg-card-surface rounded-xl p-space-md shadow-sm border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary-container ring-1 ring-primary-container shadow-md"
                      : "border-border-hairline hover:border-text-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-badge text-[9px] font-bold uppercase tracking-wider mb-1.5 ${
                          isSelected
                            ? "bg-primary-container text-on-primary"
                            : "bg-surface-container text-text-secondary"
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[12px]">
                            verified
                          </span>
                        )}
                        <span>{bus.badge || (isSelected ? "SELECTED VEHICLE" : "STANDBY")}</span>
                      </div>
                      <h3 className="font-title-md text-sm font-bold text-text-primary truncate">
                        {bus.name}
                      </h3>
                      <p className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                        {bus.subtitle}
                      </p>
                    </div>

                    <div className="w-20 h-14 rounded-lg bg-surface-container-high overflow-hidden shrink-0 relative border border-border-hairline">
                      <Image
                        src={busImage}
                        alt={bus.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* Amenities Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {bus.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low font-body-sm text-[10px] text-text-primary border border-border-hairline"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Pricing and Selection Action */}
                  <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-border-hairline">
                    <div>
                      <span className="font-body-sm text-[10px] text-text-secondary block">
                        Charter Rate
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`font-numeral-price text-base font-bold ${
                            isSelected ? "text-primary-container" : "text-text-primary"
                          }`}
                        >
                          {formatCurrency(bus.pricePerDay)}
                        </span>
                        <span className="font-body-sm text-xs text-text-secondary">/ day</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBusId(bus.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-label-md text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-primary-container text-on-primary shadow-sm flex items-center gap-1"
                          : "bg-surface-container-low text-text-primary hover:bg-surface-container border border-border-hairline"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          <span>Configured</span>
                        </>
                      ) : (
                        <span>Select Fleet</span>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Interactive Seat Selection Section */}
          <section className="flex flex-col gap-space-sm mt-2">
            <div>
              <h2 className="font-headline-sm text-sm font-bold text-text-primary">
                Select Seats &amp; Assign Travellers
              </h2>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                Assigning seats for {activeBus.capacity}-seater coach ({roster.length} of{" "}
                {trip.traveler_count} assigned)
              </p>
            </div>

            {/* Seat Legend */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-card-surface rounded-xl shadow-sm border border-border-hairline">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-card-surface border border-border-hairline shadow-inner" />
                <span className="font-label-md text-xs text-text-secondary">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-primary-container" />
                <span className="font-label-md text-xs text-text-primary font-semibold">
                  Selected
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-surface-container-highest" />
                <span className="font-label-md text-xs text-text-secondary">Occupied</span>
              </div>
            </div>

            {/* Cabin Visualization */}
            <div className="bg-card-surface rounded-xl p-3.5 shadow-sm border border-border-hairline flex flex-col gap-2.5">
              {/* Front Cockpit Indicator */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-low rounded-lg border border-border-hairline text-text-secondary">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                  <span>Front Entrance</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">
                    airline_seat_recline_normal
                  </span>
                  <span>Driver Cockpit</span>
                </div>
              </div>

              {/* Seat Map 2x2 with central aisle */}
              <div className="flex flex-col gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
                {seatGrid.map((row) => (
                  <div key={row.rowNumber} className="grid grid-cols-5 items-center gap-1.5">
                    {/* Left: A */}
                    {row.leftSeats[0] && (
                      <button
                        type="button"
                        disabled={!row.leftSeats[0].isValid}
                        onClick={() =>
                          row.leftSeats[0] &&
                          handleSeatClick(row.leftSeats[0].label, row.leftSeats[0].isValid)
                        }
                        className={`h-9 rounded-lg font-label-md text-xs font-bold flex items-center justify-center transition-all ${
                          !row.leftSeats[0].isValid
                            ? "invisible"
                            : row.leftSeats[0].status === "selected"
                            ? "bg-primary-container text-on-primary ring-2 ring-primary-container/20 shadow-sm"
                            : "bg-card-surface border border-border-hairline text-text-primary hover:bg-surface-container"
                        }`}
                      >
                        {row.leftSeats[0].label}
                      </button>
                    )}

                    {/* Left: B */}
                    {row.leftSeats[1] && (
                      <button
                        type="button"
                        disabled={!row.leftSeats[1].isValid}
                        onClick={() =>
                          row.leftSeats[1] &&
                          handleSeatClick(row.leftSeats[1].label, row.leftSeats[1].isValid)
                        }
                        className={`h-9 rounded-lg font-label-md text-xs font-bold flex items-center justify-center transition-all ${
                          !row.leftSeats[1].isValid
                            ? "invisible"
                            : row.leftSeats[1].status === "selected"
                            ? "bg-primary-container text-on-primary ring-2 ring-primary-container/20 shadow-sm"
                            : "bg-card-surface border border-border-hairline text-text-primary hover:bg-surface-container"
                        }`}
                      >
                        {row.leftSeats[1].label}
                      </button>
                    )}

                    {/* Center Aisle Row Label */}
                    <div className="flex items-center justify-center font-label-badge text-[10px] text-text-secondary select-none">
                      R{row.rowNumber}
                    </div>

                    {/* Right: C */}
                    {row.rightSeats[0] && (
                      <button
                        type="button"
                        disabled={!row.rightSeats[0].isValid}
                        onClick={() =>
                          row.rightSeats[0] &&
                          handleSeatClick(row.rightSeats[0].label, row.rightSeats[0].isValid)
                        }
                        className={`h-9 rounded-lg font-label-md text-xs font-bold flex items-center justify-center transition-all ${
                          !row.rightSeats[0].isValid
                            ? "invisible"
                            : row.rightSeats[0].status === "selected"
                            ? "bg-primary-container text-on-primary ring-2 ring-primary-container/20 shadow-sm"
                            : "bg-card-surface border border-border-hairline text-text-primary hover:bg-surface-container"
                        }`}
                      >
                        {row.rightSeats[0].label}
                      </button>
                    )}

                    {/* Right: D */}
                    {row.rightSeats[1] && (
                      <button
                        type="button"
                        disabled={!row.rightSeats[1].isValid}
                        onClick={() =>
                          row.rightSeats[1] &&
                          handleSeatClick(row.rightSeats[1].label, row.rightSeats[1].isValid)
                        }
                        className={`h-9 rounded-lg font-label-md text-xs font-bold flex items-center justify-center transition-all ${
                          !row.rightSeats[1].isValid
                            ? "invisible"
                            : row.rightSeats[1].status === "selected"
                            ? "bg-primary-container text-on-primary ring-2 ring-primary-container/20 shadow-sm"
                            : "bg-card-surface border border-border-hairline text-text-primary hover:bg-surface-container"
                        }`}
                      >
                        {row.rightSeats[1].label}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center pt-1 text-text-secondary gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[14px]">touch_app</span>
                <span>Tap any seat to assign a traveler or adjust roster</span>
              </div>
            </div>
          </section>

          {/* Corporate Roster Assignments Stack */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-title-md text-sm font-bold text-text-primary">
                Corporate Roster Assignments
              </h3>
              <span className="font-label-badge text-[10px] text-success-green font-bold uppercase tracking-wider">
                {roster.length} Synced
              </span>
            </div>

            {roster.map((p) => (
              <div
                key={p.seatLabel}
                className="p-3 bg-card-surface rounded-xl shadow-sm border border-border-hairline flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {p.seatLabel}
                  </div>
                  <div className="min-w-0">
                    <div className="font-label-lg text-xs font-bold text-text-primary truncate">
                      {p.fullName}
                    </div>
                    <div className="font-body-sm text-[11px] text-text-secondary truncate">
                      {p.designation} • Employee #{p.employeeRef}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="material-symbols-outlined text-success-green text-[20px]">
                    check_circle
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePassenger(p.seatLabel)}
                    className="p-1 rounded text-text-secondary hover:text-error transition-colors"
                    title="Remove assignment"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Unassigned Traveller Prompt Card */}
            {roster.length < trip.traveler_count && (
              <button
                type="button"
                onClick={() => {
                  setModalTargetSeat("3B");
                  setModalName("");
                  setModalPhone("+91 98000 00000");
                  setModalDesignation("Executive");
                  setModalEmpRef(String(roster.length + 1).padStart(4, "0"));
                  setShowAddModal(true);
                }}
                className="p-3.5 bg-surface-container-low rounded-xl border border-border-hairline flex items-center justify-between gap-3 hover:bg-surface-container transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-card-surface text-secondary flex items-center justify-center shadow-sm border border-border-hairline">
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                  </div>
                  <div>
                    <div className="font-label-lg text-xs font-bold text-text-primary">
                      + Assign Traveller {roster.length + 1}
                    </div>
                    <div className="font-body-sm text-[11px] text-text-secondary">
                      Tap available seats or add executive pass
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-[20px]">
                  chevron_right
                </span>
              </button>
            )}
          </section>
        </div>
      </main>

      {/* Sticky Bottom Shelf */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card-surface/95 backdrop-blur-xl px-margin-mobile pt-3 pb-safe shadow-[0_-4px_20px_rgba(20,21,26,0.06)] border-t border-border-hairline">
        <div className="max-w-md mx-auto flex flex-col gap-2.5 pb-2">
          {/* Estimated Charter Cost (D24: Real Days Count) */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-text-secondary font-medium">
              Total Estimated Charter ({totalDays} Days)
            </span>
            <span className="font-numeral-price text-base font-bold text-text-primary">
              {formatCurrency(totalCharterCost)}
            </span>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleSubmitBooking}
            disabled={isSubmitting || roster.length === 0}
            className="w-full h-12 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary rounded-xl font-label-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting Booking...</span>
              </span>
            ) : (
              <>
                <span>Continue to Review &amp; Confirm</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-center px-2">
            <span className="material-symbols-outlined text-text-secondary text-[14px]">info</span>
            <p className="font-body-sm text-[10px] text-text-secondary">
              Seat assignments can be adjusted up to 12 hours prior to departure
            </p>
          </div>
        </div>
      </footer>

      {/* Modal: Assign / Edit Passenger */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-surface-dark/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-card-surface rounded-2xl p-5 shadow-xl border border-border-hairline flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-sm font-bold text-text-primary">
                Assign Seat {modalTargetSeat}
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Sneha Kapoor"
                  className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  placeholder="+91 98112 34567"
                  className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={modalDesignation}
                    onChange={(e) => setModalDesignation(e.target.value)}
                    placeholder="e.g. VP Marketing"
                    className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="font-label-badge text-[10px] text-text-secondary uppercase block mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={modalEmpRef}
                    onChange={(e) => setModalEmpRef(e.target.value)}
                    placeholder="e.g. 0540"
                    className="w-full px-3 py-2 rounded-lg bg-card-surface text-xs font-semibold text-text-primary border border-border-hairline focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-text-secondary font-label-md text-xs font-semibold hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalPassenger}
                disabled={!modalName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-xs font-bold hover:bg-primary transition-colors disabled:opacity-50"
              >
                Assign Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
