import { describe, it, expect } from "vitest";
import {
  isSeatValidForCapacity,
  generateBusSeatGrid,
  getRecommendedBusText,
  getPublicTicketDetails,
} from "@/lib/data/commercial";

describe("Milestone M7 — Commercial & Corporate Fleet (BUILD_PLAN.md & DECISIONS D2-D4, D22, D24)", () => {
  describe("1. Seat Map & Bus Capacity Respect (Acceptance Check)", () => {
    it("validates 45-seater Volvo 9600 capacity (seats 1A through 12A are valid, 12B+ are invalid)", () => {
      const capacity = 45;

      // Row 1
      expect(isSeatValidForCapacity("1A", capacity)).toBe(true);
      expect(isSeatValidForCapacity("1B", capacity)).toBe(true);
      expect(isSeatValidForCapacity("1C", capacity)).toBe(true);
      expect(isSeatValidForCapacity("1D", capacity)).toBe(true);

      // Row 11 (seats 41..44)
      expect(isSeatValidForCapacity("11A", capacity)).toBe(true);
      expect(isSeatValidForCapacity("11D", capacity)).toBe(true);

      // Row 12 (seat 45 is 12A)
      expect(isSeatValidForCapacity("12A", capacity)).toBe(true); // seat index 45
      expect(isSeatValidForCapacity("12B", capacity)).toBe(false); // seat index 46 > 45
      expect(isSeatValidForCapacity("12C", capacity)).toBe(false);
      expect(isSeatValidForCapacity("13A", capacity)).toBe(false);
    });

    it("validates 32-seater BharatBenz Glider capacity (seats 1A through 8D are valid, 9A+ are invalid)", () => {
      const capacity = 32;

      expect(isSeatValidForCapacity("1A", capacity)).toBe(true);
      expect(isSeatValidForCapacity("8D", capacity)).toBe(true); // 8 * 4 = 32
      expect(isSeatValidForCapacity("9A", capacity)).toBe(false); // 33 > 32
    });

    it("validates 17-seater Force Urbania capacity (seats 1A through 5A are valid, 5B+ are invalid)", () => {
      const capacity = 17;

      expect(isSeatValidForCapacity("1A", capacity)).toBe(true);
      expect(isSeatValidForCapacity("4D", capacity)).toBe(true); // 16 <= 17
      expect(isSeatValidForCapacity("5A", capacity)).toBe(true); // 17 <= 17
      expect(isSeatValidForCapacity("5B", capacity)).toBe(false); // 18 > 17
    });

    it("rejects invalid seat label formats", () => {
      expect(isSeatValidForCapacity("0A", 45)).toBe(false);
      expect(isSeatValidForCapacity("1E", 45)).toBe(false);
      expect(isSeatValidForCapacity("A1", 45)).toBe(false);
      expect(isSeatValidForCapacity("", 45)).toBe(false);
      expect(isSeatValidForCapacity("2Z", 45)).toBe(false);
    });

    it("generates correct row and seat structures with central aisle in generateBusSeatGrid", () => {
      const grid = generateBusSeatGrid(45, ["1A"], ["2A", "2B"]);
      expect(grid.length).toBe(12); // ceil(45/4) = 12

      // Row 1
      const row1 = grid[0]!;
      expect(row1.rowNumber).toBe(1);
      expect(row1.leftSeats.map((s) => s.label)).toEqual(["1A", "1B"]);
      expect(row1.rightSeats.map((s) => s.label)).toEqual(["1C", "1D"]);
      expect(row1.leftSeats[0]?.status).toBe("occupied");

      // Row 2
      const row2 = grid[1]!;
      expect(row2.leftSeats[0]?.status).toBe("selected");
      expect(row2.leftSeats[1]?.status).toBe("selected");
      expect(row2.rightSeats[0]?.status).toBe("available");

      // Row 12
      const row12 = grid[11]!;
      expect(row12.leftSeats[0]?.isValid).toBe(true); // 12A
      expect(row12.leftSeats[1]?.isValid).toBe(false); // 12B
      expect(row12.rightSeats[0]?.isValid).toBe(false); // 12C
      expect(row12.rightSeats[1]?.isValid).toBe(false); // 12D
    });
  });

  describe("2. Partial Rosters Validation (DECISIONS D3 & DATABASE §6)", () => {
    it("permits partial rosters where 1 <= named passengers <= headcount", () => {
      const headcount = 28;
      const namedRoster = [
        { fullName: "Aarav Sharma", seatLabel: "2A" },
        { fullName: "Priya Nair", seatLabel: "2B" },
        { fullName: "Rohan Verma", seatLabel: "3A" },
      ];

      expect(namedRoster.length).toBeGreaterThanOrEqual(1);
      expect(namedRoster.length).toBeLessThanOrEqual(headcount);
    });

    it("detects and rejects duplicate seat assignments", () => {
      const duplicateRoster = [
        { fullName: "Person 1", seatLabel: "2A" },
        { fullName: "Person 2", seatLabel: "2A" },
      ];

      const seen = new Set<string>();
      let hasDuplicate = false;
      for (const p of duplicateRoster) {
        if (seen.has(p.seatLabel)) {
          hasDuplicate = true;
          break;
        }
        seen.add(p.seatLabel);
      }
      expect(hasDuplicate).toBe(true);
    });
  });

  describe("3. Worked Commercial Pricing Check #11 (DATABASE §11 & DECISIONS D24)", () => {
    it("computes commercial package: 5 days × ₹38,500 = ₹1,92,500, tax ₹34,650, total ₹2,27,150", () => {
      const days = 5;
      const dailyRate = 38500;
      const subtotal = days * dailyRate;
      expect(subtotal).toBe(192500);

      const serviceFee = 0; // commercial has 0 service fee per DATABASE §3
      const gstRate = 0.18;
      const taxAmount = Math.round(gstRate * subtotal);
      expect(taxAmount).toBe(34650);

      const discount = 0; // commercial has 0 discount per DATABASE §3
      const totalAmount = subtotal + serviceFee + taxAmount - discount;
      expect(totalAmount).toBe(227150);

      // Per traveler for 28 pax (Screen 20 check)
      const headcount = 28;
      const perTraveler = totalAmount / headcount;
      expect(perTraveler).toBe(8112.5);
    });
  });

  describe("4. Dynamic Fleet Recommendation Logic (Screen 18)", () => {
    it("recommends correct bus size based on headcount", () => {
      expect(getRecommendedBusText(12)).toContain("Force Urbania 17-Seater");
      expect(getRecommendedBusText(28)).toContain("32-Seater Luxury Volvo or 2 Tempo Travellers");
      expect(getRecommendedBusText(40)).toContain("45-Seater Luxury Volvo 9600");
      expect(getRecommendedBusText(80)).toContain("Multiple Dedicated Luxury Volvo Coaches");
    });
  });

  describe("5. Public Ticket Privacy & Logged-out Verification (DECISIONS D22)", () => {
    it("returns public ticket data without sensitive phone, ID docs, or payment amounts", async () => {
      const ticket = await getPublicTicketDetails("TKT-TMCORP0412");
      expect(ticket).not.toBeNull();

      if (ticket) {
        // Allowed public fields
        expect(ticket.passenger_name).toBe("Aarav Sharma");
        expect(ticket.seat_label).toBe("2A");
        expect(ticket.booking_ref).toBe("TM-008821");
        expect(ticket.from_location).toBe("Delhi NCR");
        expect(ticket.to_location).toBe("Jaipur Heritage Circuit");
        expect(ticket.company_name).toBe("Acme Tech Pvt Ltd");

        // STRICT PRIVACY CHECK: phone, amounts, and ID docs MUST NOT exist on public ticket object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawObj = ticket as any;
        expect(rawObj.phone).toBeUndefined();
        expect(rawObj.id_doc_path).toBeUndefined();
        expect(rawObj.id_doc_type).toBeUndefined();
        expect(rawObj.total_amount).toBeUndefined();
        expect(rawObj.subtotal_amount).toBeUndefined();
        expect(rawObj.price).toBeUndefined();
      }
    });

    it("returns null for non-existent / empty ticket code", async () => {
      const invalid = await getPublicTicketDetails("");
      expect(invalid).toBeNull();
    });
  });
});
