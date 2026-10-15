import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeatGridProps {
  rows?: number; // default: 7 rows (28 seats)
  occupiedSeats?: string[]; // e.g. ["1A", "1B", "1C", "1D", "5A", "5B", "5C", "5D"]
  selectedSeats: string[]; // controlled array of selected seat IDs
  onSeatToggle: (seatId: string) => void;
  maxSelectable?: number;
  className?: string;
  showLegend?: boolean;
}

export function SeatGrid({
  rows = 7,
  occupiedSeats = [],
  selectedSeats,
  onSeatToggle,
  maxSelectable,
  className,
  showLegend = true,
}: SeatGridProps) {
  const occupiedSet = React.useMemo(() => new Set(occupiedSeats), [occupiedSeats]);
  const selectedSet = React.useMemo(() => new Set(selectedSeats), [selectedSeats]);

  const seatColumns = ["A", "B", "aisle", "C", "D"] as const;

  return (
    <div className={cn("flex flex-col gap-space-sm w-full", className)}>
      {showLegend && (
        <div className="flex items-center justify-between px-space-md py-space-sm bg-card-surface border border-border-hairline rounded-xl shadow-sm text-label-md">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-card-surface border border-border-hairline shadow-sm" />
            <span className="text-text-secondary">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-primary-container" />
            <span className="text-text-primary font-semibold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-surface-container-highest" />
            <span className="text-text-secondary">Occupied</span>
          </div>
        </div>
      )}

      {/* Bus Cabin Visualization */}
      <div className="bg-card-surface border border-border-hairline rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm">
        {/* Cockpit / Entrance Header */}
        <div className="flex items-center justify-between px-space-sm py-2 bg-surface-container-low rounded-lg text-text-secondary text-label-badge font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span>🚪</span>
            <span>Front Entrance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💺</span>
            <span>Driver Cockpit</span>
          </div>
        </div>

        {/* Seat Rows Grid */}
        <div className="flex flex-col gap-2.5 pt-space-xs">
          {Array.from({ length: rows }, (_, rowIdx) => {
            const rowNumber = rowIdx + 1;
            return (
              <div
                key={rowNumber}
                className="grid grid-cols-5 items-center gap-2 text-center"
              >
                {seatColumns.map((col) => {
                  if (col === "aisle") {
                    return (
                      <div
                        key={`aisle-${rowNumber}`}
                        className="flex items-center justify-center font-label-badge text-text-secondary select-none"
                      >
                        R{rowNumber}
                      </div>
                    );
                  }

                  const seatId = `${rowNumber}${col}`;
                  const isOccupied = occupiedSet.has(seatId);
                  const isSelected = selectedSet.has(seatId);

                  const canSelect =
                    !isOccupied &&
                    (isSelected || maxSelectable === undefined || selectedSeats.length < maxSelectable);

                  return (
                    <button
                      key={seatId}
                      type="button"
                      disabled={isOccupied || (!isSelected && !canSelect)}
                      aria-label={`Seat ${seatId} ${
                        isOccupied ? "Occupied" : isSelected ? "Selected" : "Available"
                      }`}
                      onClick={() => onSeatToggle(seatId)}
                      className={cn(
                        "h-10 rounded-lg font-label-md text-label-md flex items-center justify-center transition-all duration-150 select-none",
                        isOccupied &&
                          "bg-surface-container-highest text-secondary cursor-not-allowed border border-transparent",
                        isSelected &&
                          "bg-primary-container text-white font-bold ring-2 ring-primary-container/20 shadow-sm",
                        !isOccupied &&
                          !isSelected &&
                          "bg-card-surface border border-border-hairline shadow-sm text-text-primary hover:bg-surface-container hover:border-text-primary/20 cursor-pointer active:scale-95"
                      )}
                    >
                      {seatId}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-center pt-space-xs text-text-secondary text-body-sm gap-1 border-t border-border-hairline mt-1">
          <span>Tap available seats to allocate travellers ({selectedSeats.length} selected{maxSelectable ? ` of ${maxSelectable}` : ""})</span>
        </div>
      </div>
    </div>
  );
}
