import type { Database } from "@/types/database";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
export type TripRow = Database["public"]["Tables"]["trips"]["Row"];
export type CommercialBookingRow = Database["public"]["Tables"]["commercial_bookings"]["Row"];
export type TripPassengerRow = Database["public"]["Tables"]["trip_passengers"]["Row"];

export interface CompanyMembershipInfo {
  company: {
    id: string;
    name: string;
    gst_number: string | null;
  };
  role: "member" | "admin";
  profileId: string;
  department: string | null;
  designation: string | null;
  employeeId: string | null;
}

export interface BusFleetItem {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  capacity: number;
  luggageCapacity: number;
  features: string[];
  pricePerDay: number;
  rating: number;
  badge: string;
  imagePath: string | null;
}

export interface SeatInfo {
  label: string; // e.g. "1A", "2B"
  row: number;
  col: "A" | "B" | "C" | "D";
  seatIndex: number;
  isValid: boolean;
  status: "available" | "selected" | "occupied";
}

export interface CommercialRosterPassenger {
  id?: string;
  fullName: string;
  phone: string;
  designation: string;
  employeeRef: string;
  seatLabel: string;
  ticketCode?: string | null;
  isLead?: boolean;
}

export interface CommercialDraftData {
  trip: TripRow;
  commercialBooking: CommercialBookingRow;
  company: CompanyRow;
  selectedVehicle: VehicleRow | null;
  passengers: TripPassengerRow[];
}

export interface ConfirmedCommercialTripData {
  trip: TripRow;
  commercialBooking?: CommercialBookingRow | null;
  company: CompanyRow;
  vehicle?: VehicleRow | null;
  passengers: TripPassengerRow[];
  invoice?: Database["public"]["Tables"]["invoices"]["Row"] | null;
}

export interface PublicTicketResult {
  passenger_name: string;
  seat_label: string;
  designation: string | null;
  booking_ref: string;
  from_location: string;
  to_location: string;
  start_date: string;
  end_date: string;
  booking_time: string | null;
  vehicle_name: string;
  company_name: string;
  ticket_code: string;
}

export const FALLBACK_COMPANY: CompanyRow = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Acme Tech Pvt Ltd",
  gst_number: "08AAACA1234A1Z5",
  created_at: "2026-10-09T00:00:00Z",
  updated_at: "2026-10-09T00:00:00Z",
};

export const FALLBACK_BUSES: BusFleetItem[] = [
  {
    id: "v4444444-4444-4444-4444-444444444444",
    name: "Volvo 9600 Multi-Axle Luxury Coach",
    subtitle: "45 Seater AC Semi-Sleeper • BS6 Phase 2",
    description:
      "Flagship multi-axle luxury coach with plush pushback seats, panoramic tinted windows, USB charging ports, and smooth pneumatic air suspension.",
    capacity: 45,
    luggageCapacity: 40,
    features: [
      "High-Speed Wi-Fi",
      "220V Outlets",
      "135° Recline",
      "Air Suspension",
      "Individual AC Vents",
    ],
    pricePerDay: 38500,
    rating: 4.95,
    badge: "SELECTED VEHICLE",
    imagePath: null,
  },
  {
    id: "v5555555-5555-5555-5555-555555555555",
    name: "BharatBenz Executive Glider",
    subtitle: "32 Seater AC Pushback • Ergonomic Cabin",
    description:
      "Contemporary streamlined corporate livery coach with ergonomic seating and quiet cabin acoustics for medium-sized team offsites.",
    capacity: 32,
    luggageCapacity: 28,
    features: [
      "Air Conditioned",
      "Pushback Seats",
      "Ample Legroom",
      "Professional Chauffeur",
    ],
    pricePerDay: 28000,
    rating: 4.85,
    badge: "STANDBY AVAILABLE",
    imagePath: null,
  },
  {
    id: "v6666666-6666-6666-6666-666666666666",
    name: "Force Urbania Executive Cruiser",
    subtitle: "17 Seater Luxury Mini-Coach • Captain Chairs",
    description:
      "Modern executive shuttle van with standalone captain chairs, high roof, and sleek European styling for executive committees.",
    capacity: 17,
    luggageCapacity: 15,
    features: [
      "Standalone Captain Chairs",
      "High Roof Walk-through",
      "Individual AC",
      "Fast Transit",
    ],
    pricePerDay: 18500,
    rating: 4.9,
    badge: "FAST TRANSIT",
    imagePath: null,
  },
];

/**
 * Checks whether seatLabel (e.g. "2A") is valid for a given bus capacity (N).
 * 2x2 row-major layout: row = number, col = letter (A=1, B=2, C=3, D=4).
 * Seat index = (row - 1) * 4 + colIndex. Must be <= capacity.
 */
export function isSeatValidForCapacity(seatLabel: string, capacity: number): boolean {
  if (!/^[1-9][0-9]*[A-D]$/.test(seatLabel)) {
    return false;
  }
  const match = seatLabel.match(/^([0-9]+)([A-D])$/);
  if (!match || !match[1] || !match[2]) return false;
  const row = parseInt(match[1], 10);
  const colLetter = match[2];
  const colIndex = colLetter.charCodeAt(0) - "A".charCodeAt(0) + 1;
  const seatIndex = (row - 1) * 4 + colIndex;
  return seatIndex <= capacity;
}

/**
 * Recommends fleet vehicle sizing based on passenger headcount.
 */
export function getRecommendedBusText(headcount: number): string {
  if (headcount <= 17) {
    return "Recommended: Force Urbania 17-Seater Luxury Mini-Coach";
  }
  if (headcount <= 32) {
    return "Recommended: 32-Seater Luxury Volvo or 2 Tempo Travellers";
  }
  if (headcount <= 45) {
    return "Recommended: 45-Seater Luxury Volvo 9600 Coach";
  }
  return "Recommended: Multiple Dedicated Luxury Volvo Coaches or Fleet";
}

/**
 * Generates seat map rows for a bus capacity (e.g. 45 or 32 or 17).
 */
export function generateBusSeatGrid(
  capacity: number,
  occupiedSeats: string[] = [],
  selectedSeats: string[] = []
): {
  rowNumber: number;
  leftSeats: SeatInfo[]; // A, B
  rightSeats: SeatInfo[]; // C, D
}[] {
  const totalRows = Math.ceil(capacity / 4);
  const grid: {
    rowNumber: number;
    leftSeats: SeatInfo[];
    rightSeats: SeatInfo[];
  }[] = [];

  for (let r = 1; r <= totalRows; r++) {
    const cols: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
    const left: SeatInfo[] = [];
    const right: SeatInfo[] = [];

    cols.forEach((col) => {
      const label = `${r}${col}`;
      const colIndex = col.charCodeAt(0) - "A".charCodeAt(0) + 1;
      const seatIndex = (r - 1) * 4 + colIndex;
      const isValid = seatIndex <= capacity;

      let status: "available" | "selected" | "occupied" = "available";
      if (occupiedSeats.includes(label)) {
        status = "occupied";
      } else if (selectedSeats.includes(label)) {
        status = "selected";
      }

      const seatObj: SeatInfo = {
        label,
        row: r,
        col,
        seatIndex,
        isValid,
        status,
      };

      if (col === "A" || col === "B") {
        left.push(seatObj);
      } else {
        right.push(seatObj);
      }
    });

    grid.push({
      rowNumber: r,
      leftSeats: left,
      rightSeats: right,
    });
  }

  return grid;
}
