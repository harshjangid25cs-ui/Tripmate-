"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import type { Vehicle } from "@/lib/data/booking";
import { getVehicleImageUrl } from "@/lib/data/images";
import { formatCurrency } from "@/lib/format";
import { selectTripVehicle } from "@/lib/actions/trips";

interface VehicleSelectionViewProps {
  tripData: ValidatedDraftTrip;
  vehicles: Vehicle[];
}

type ModeFilter = "car" | "bike";
type SpecFilter = "all" | "sedan" | "suv" | "self_drive" | "chauffeur";

export function VehicleSelectionView({
  tripData,
  vehicles,
}: VehicleSelectionViewProps) {
  const router = useRouter();
  const { trip, vehicle: selectedTripVehicle, destination } = tripData;

  const [mode, setMode] = React.useState<ModeFilter>("car");
  const [specFilter, setSpecFilter] = React.useState<SpecFilter>("all");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(
    selectedTripVehicle?.vehicle_id ??
      vehicles.find((v) => v.type === "car")?.id ??
      null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const totalDays = trip.total_days ?? 4;

  // Filtered vehicles based on mode (Car vs Bike) and chips
  const filteredVehicles = React.useMemo(() => {
    let list = vehicles.filter((v) => v.type === mode);

    if (specFilter === "sedan") {
      list = list.filter((v) => v.name.toLowerCase().includes("dzire") || v.capacity === 4);
    } else if (specFilter === "suv") {
      list = list.filter((v) => (v.capacity ?? 0) >= 6);
    } else if (specFilter === "self_drive") {
      list = list.filter((v) => v.driverType === "self_drive");
    } else if (specFilter === "chauffeur") {
      list = list.filter((v) => v.driverType === "chauffeur");
    }

    return list;
  }, [vehicles, mode, specFilter]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleSelectVehicle = async (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setErrorMsg(null);
    try {
      const res = await selectTripVehicle({
        tripId: trip.id,
        vehicleId,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Failed to save vehicle choice.");
      }
    } catch {
      setErrorMsg("Failed to update vehicle selection.");
    }
  };

  const handleContinue = async () => {
    if (!selectedVehicleId) {
      setErrorMsg("Please select a ride before proceeding.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await selectTripVehicle({
        tripId: trip.id,
        vehicleId: selectedVehicleId,
      });

      if (res.ok) {
        router.push(`/book/${trip.id}/stops`);
      } else {
        setErrorMsg(res.error ?? "Failed to save vehicle.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  const selectedSummaryName = selectedVehicle
    ? selectedVehicle.type === "bike"
      ? "Bike Selected"
      : (selectedVehicle.capacity ?? 0) >= 6
      ? "SUV Selected"
      : "Sedan Selected"
    : "No Vehicle Selected";

  const selectedSummaryPrice = selectedVehicle
    ? formatCurrency(selectedVehicle.price * totalDays)
    : "₹0";

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Go Back"
              className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container transition-colors active:scale-95"
              onClick={() => router.push(`/book/${trip.id}/hotel`)}
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-1.5" aria-label="Tripmate Logo">
              <svg
                width="24"
                height="24"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
              >
                <rect width="28" height="28" rx="7" fill="#E11D2E" />
                <path
                  d="M7 20V8L14 14L21 8V20"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-bold tracking-tight text-neutral-900 leading-none">
                Tripmate
              </span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-text-primary tracking-tight truncate max-w-[150px] ml-1">
              Vehicle
            </h1>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Trip Info"
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">info</span>
            </button>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="Profile"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full bg-surface pt-16 pb-safe">
        <div className="flex flex-col w-full max-w-md mx-auto pb-32">
          {/* Content Context Intro Header */}
          <div className="px-margin-mobile pt-space-md pb-space-sm flex flex-col gap-1">
            <div className="flex items-center gap-space-xs text-text-secondary font-label-md text-label-md">
              <span className="material-symbols-outlined text-[16px] text-primary">
                location_on
              </span>
              <span>
                {/* Header label Step 3 of 4 per DECISIONS D19 */}
                Step 3 of 4 • {destination?.name ?? "Jaipur"} Expedition
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
              Choose Local Ride in {destination?.name ?? "Jaipur"}
            </h2>
            <p className="font-body-md text-body-md text-text-secondary leading-snug">
              All options include verified drivers or self-drive handover at airport/station.
            </p>
          </div>

          {/* Vehicle Category Switcher (Car Rental vs Bike & Scooter) */}
          <div className="px-margin-mobile pt-space-xs pb-space-sm">
            <div className="bg-surface-container-high p-1 rounded-xl flex items-center gap-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("car");
                  setSpecFilter("all");
                  const firstCar = vehicles.find((v) => v.type === "car");
                  if (firstCar && selectedVehicle?.type !== "car") {
                    handleSelectVehicle(firstCar.id);
                  }
                }}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-label-lg text-label-lg transition-all active:scale-95 ${
                  mode === "car"
                    ? "bg-primary-container text-on-primary shadow-sm font-semibold"
                    : "bg-card-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  directions_car
                </span>
                <span>Car Rental</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("bike");
                  setSpecFilter("all");
                  const firstBike = vehicles.find((v) => v.type === "bike");
                  if (firstBike && selectedVehicle?.type !== "bike") {
                    handleSelectVehicle(firstBike.id);
                  }
                }}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-label-lg text-label-lg transition-all active:scale-95 ${
                  mode === "bike"
                    ? "bg-primary-container text-on-primary shadow-sm font-semibold"
                    : "bg-card-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  two_wheeler
                </span>
                <span>Bike &amp; Scooter</span>
              </button>
            </div>
          </div>

          {/* Filter Chips Horizontal Scroller */}
          <div className="w-full overflow-x-auto py-space-xs px-margin-mobile flex items-center gap-2 no-scrollbar">
            <button
              type="button"
              onClick={() => setSpecFilter("all")}
              className={`px-4 py-2 rounded-full font-label-md text-label-md shadow-sm shrink-0 flex items-center gap-1.5 transition-colors active:scale-95 ${
                specFilter === "all"
                  ? "bg-surface-dark text-card-surface"
                  : "bg-card-surface text-text-primary hover:bg-surface-container"
              }`}
            >
              <span>All Options</span>
              <span className="w-4 h-4 rounded-full bg-card-surface/20 flex items-center justify-center text-[10px]">
                {vehicles.filter((v) => v.type === mode).length}
              </span>
            </button>
            {mode === "car" && (
              <>
                <button
                  type="button"
                  onClick={() => setSpecFilter("sedan")}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors active:scale-95 ${
                    specFilter === "sedan"
                      ? "bg-surface-dark text-card-surface"
                      : "bg-card-surface text-text-primary hover:bg-surface-container"
                  }`}
                >
                  Sedan (AC)
                </button>
                <button
                  type="button"
                  onClick={() => setSpecFilter("suv")}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors active:scale-95 ${
                    specFilter === "suv"
                      ? "bg-surface-dark text-card-surface"
                      : "bg-card-surface text-text-primary hover:bg-surface-container"
                  }`}
                >
                  SUV (6 Seater)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSpecFilter("self_drive")}
              className={`px-4 py-2 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors active:scale-95 ${
                specFilter === "self_drive"
                  ? "bg-surface-dark text-card-surface"
                  : "bg-card-surface text-text-primary hover:bg-surface-container"
              }`}
            >
              Self Drive
            </button>
            <button
              type="button"
              onClick={() => setSpecFilter("chauffeur")}
              className={`px-4 py-2 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors active:scale-95 ${
                specFilter === "chauffeur"
                  ? "bg-surface-dark text-card-surface"
                  : "bg-card-surface text-text-primary hover:bg-surface-container"
              }`}
            >
              With Chauffeur
            </button>
          </div>

          {/* Guarantee Mini Micro-banner */}
          <div className="px-margin-mobile pt-space-xs pb-space-sm">
            <div className="bg-surface-container-low rounded-xl px-3.5 py-2.5 flex items-center justify-between border border-border-hairline/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-success-green text-[18px]">
                  verified_user
                </span>
                <span className="font-body-sm text-body-sm text-text-primary font-medium">
                  Free cancellation up to 2 hours prior to arrival
                </span>
              </div>
              <span className="font-label-badge text-label-badge text-text-secondary uppercase">
                Guaranteed
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mx-margin-mobile mb-4 p-3 rounded-xl bg-error-container/30 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vehicle Cards Stack */}
          <div className="px-margin-mobile flex flex-col gap-space-md">
            {filteredVehicles.map((vehicle) => {
              const isSelected = selectedVehicleId === vehicle.id;
              const vehicleImg = getVehicleImageUrl(vehicle.name, vehicle.imagePath);
              const totalVehiclePrice = vehicle.price * totalDays;

              return (
                <div
                  key={vehicle.id}
                  className={`bg-card-surface rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all border ${
                    isSelected
                      ? "ring-2 ring-primary-container border-transparent shadow-md"
                      : "border-border-hairline hover:shadow-md"
                  }`}
                >
                  {/* Media Module */}
                  <div className="relative w-full aspect-[4/3] bg-surface-container overflow-hidden">
                    <Image
                      src={vehicleImg}
                      alt={vehicle.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 448px"
                    />
                    {vehicle.badge && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-urgency-amber text-on-error shadow-sm font-label-badge text-label-badge uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">
                          local_fire_department
                        </span>
                        <span>{vehicle.badge}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-surface-dark/70 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-card-surface">
                      <span className="material-symbols-outlined text-success-green text-[14px]">
                        check_circle
                      </span>
                      <span className="font-label-badge text-label-badge tracking-wide">
                        Top Rated {vehicle.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Content Block */}
                  <div className="p-space-md flex flex-col gap-space-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-text-primary">
                          {vehicle.name}
                        </h3>
                        {vehicle.subtitle && (
                          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                            {vehicle.subtitle}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-full text-primary font-label-md text-label-md font-semibold">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          <span>Selected</span>
                        </div>
                      )}
                    </div>

                    {/* Specs Matrix */}
                    <div className="bg-surface-container-low rounded-xl p-3 flex flex-wrap gap-y-2 gap-x-4 text-text-secondary font-body-sm text-body-sm border border-border-hairline/40">
                      {vehicle.capacity && (
                        <div className="flex items-center gap-1.5 text-text-primary">
                          <span className="material-symbols-outlined text-[16px] text-text-secondary">
                            airline_seat_recline_normal
                          </span>
                          <span>{vehicle.capacity} Seater</span>
                        </div>
                      )}
                      {vehicle.luggageCapacity && (
                        <div className="flex items-center gap-1.5 text-text-primary">
                          <span className="material-symbols-outlined text-[16px] text-text-secondary">
                            luggage
                          </span>
                          <span>{vehicle.luggageCapacity} Bags</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-text-primary">
                        <span className="material-symbols-outlined text-[16px] text-text-secondary">
                          ac_unit
                        </span>
                        <span>Climate Control</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-primary">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {vehicle.driverType === "chauffeur" ? "person_check" : "two_wheeler"}
                        </span>
                        <span>
                          {vehicle.driverType === "chauffeur"
                            ? "Pro Chauffeur"
                            : "Self Drive"}
                        </span>
                      </div>
                    </div>

                    {/* Fuel & Policy */}
                    <div className="flex items-center gap-2 text-text-secondary font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-success-green text-[18px]">
                        verified
                      </span>
                      <span>
                        {vehicle.fuelPolicy ?? "Fuel & toll taxes covered up to 300 km"}
                      </span>
                    </div>

                    {/* Pricing Shelf */}
                    <div className="pt-2 flex items-center justify-between border-t border-border-hairline/60">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="font-numeral-price text-numeral-price text-primary-container">
                            {formatCurrency(vehicle.price)}
                          </span>
                          <span className="font-body-sm text-body-sm text-text-secondary">
                            / day
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-text-secondary font-medium">
                          Total: {formatCurrency(totalVehiclePrice)} ({totalDays} days) • + taxes
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectVehicle(vehicle.id)}
                        className={`px-5 py-2.5 rounded-xl font-label-lg text-label-lg uppercase active:scale-95 transition-all flex items-center gap-2 shadow-sm ${
                          isSelected
                            ? "bg-primary-container text-on-primary font-bold"
                            : "bg-surface-dark hover:bg-black text-card-surface font-medium"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <span className="material-symbols-outlined text-[18px]">
                              check
                            </span>
                            <span>Applied</span>
                          </>
                        ) : (
                          "Apply Ride"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fixed Bottom Summary & Progression Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 px-margin-mobile pb-safe pt-2">
            <div className="mb-3 max-w-md mx-auto bg-card-surface/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-xl border border-border-hairline flex items-center justify-between">
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
                  <span className="font-label-badge text-label-badge text-text-secondary uppercase truncate">
                    {selectedSummaryName}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    Total:
                  </span>
                  <span className="font-title-md text-title-md text-text-primary font-bold">
                    {selectedSummaryPrice}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    • {totalDays} days
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedVehicleId || isSubmitting}
                onClick={handleContinue}
                className="bg-primary-container hover:bg-primary active:scale-[0.98] transition-all text-on-primary font-label-lg text-label-lg uppercase px-5 py-3 rounded-xl flex items-center gap-2 shadow-md shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? "Saving..." : "Continue"}</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
