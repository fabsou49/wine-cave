import type { Section, Slot, Bottle } from "../api";
import SlotCell from "./SlotCell";

interface Props {
  section: Section;
  slots: Slot[];
  bottles: Bottle[];
  onSlotClick?: (slot: Slot, bottle?: Bottle) => void;
}

export default function CaveView({ section, slots, bottles, onSlotClick }: Props) {
  const bottleBySlot = new Map<number, Bottle>();
  for (const b of bottles) {
    if (b.slot_id != null) bottleBySlot.set(b.slot_id, b);
  }

  // Build a 2D grid
  const grid: (Slot | undefined)[][] = Array.from({ length: section.rows }, () =>
    Array(section.cols).fill(undefined)
  );
  for (const slot of slots) {
    if (slot.row < section.rows && slot.col < section.cols) {
      grid[slot.row][slot.col] = slot;
    }
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-stone-300"
      style={
        section.photo_path
          ? {
              backgroundImage: `url(${section.photo_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { background: "#f5f0eb" }
      }
    >
      {section.photo_path && (
        <div className="absolute inset-0 bg-black/20" />
      )}
      <div
        className="relative p-2 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${section.cols}, minmax(0, 1fr))` }}
      >
        {grid.map((row, ri) =>
          row.map((slot, ci) =>
            slot ? (
              <SlotCell
                key={slot.id}
                slot={slot}
                bottle={bottleBySlot.get(slot.id)}
                onClick={() => onSlotClick?.(slot, bottleBySlot.get(slot.id))}
              />
            ) : (
              <div
                key={`empty-${ri}-${ci}`}
                className="aspect-[2/3] min-w-[40px] border border-dashed border-stone-300 rounded opacity-30"
              />
            )
          )
        )}
      </div>
    </div>
  );
}
