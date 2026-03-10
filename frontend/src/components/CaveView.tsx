import type { Section, Slot, Bottle } from "../api";
import SlotCell from "./SlotCell";

interface Props {
  section: Section;
  slots: Slot[];
  bottles: Bottle[];
  onSlotClick?: (slot: Slot, bottle?: Bottle) => void;
}

// Convert col index to letter(s): 0→A, 1→B, …, 25→Z, 26→AA …
function colLabel(idx: number): string {
  let label = "";
  let n = idx;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export default function CaveView({ section, slots, bottles, onSlotClick }: Props) {
  // Resolve per-column row counts
  const columnRows: number[] = section.column_rows
    ? JSON.parse(section.column_rows)
    : Array(section.cols).fill(section.rows);

  const maxRows = Math.max(...columnRows);

  // Index bottles by slot id
  const bottleBySlot = new Map<number, Bottle>();
  for (const b of bottles) {
    if (b.slot_id != null) bottleBySlot.set(b.slot_id, b);
  }

  // Index slots by [col][row]
  const slotMap = new Map<number, Map<number, Slot>>();
  for (const slot of slots) {
    if (!slotMap.has(slot.col)) slotMap.set(slot.col, new Map());
    slotMap.get(slot.col)!.set(slot.row, slot);
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-stone-300"
      style={
        section.photo_path
          ? { backgroundImage: `url(${section.photo_path})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "#f5f0eb" }
      }
    >
      {section.photo_path && <div className="absolute inset-0 bg-black/20" />}

      <div className="relative p-2 overflow-x-auto">
        <div className="flex gap-1 w-fit">
          {/* Row number axis */}
          <div className="flex flex-col gap-1">
            {/* Corner spacer aligned with column headers */}
            <div className="h-6" />
            {Array.from({ length: maxRows }, (_, rowIdx) => (
              <div
                key={rowIdx}
                className="aspect-[2/3] min-w-[22px] flex items-center justify-center"
              >
                <span className="text-[10px] font-semibold text-stone-500 leading-none">
                  {rowIdx + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          {columnRows.map((numRows, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-1">
              {/* Column header */}
              <div className="h-6 flex items-center justify-center">
                <span className="text-[11px] font-bold text-stone-600 leading-none">
                  {colLabel(colIdx)}
                </span>
              </div>

              {/* Slots */}
              {Array.from({ length: maxRows }, (_, rowIdx) => {
                if (rowIdx >= numRows) {
                  // Invisible spacer to keep alignment
                  return (
                    <div
                      key={rowIdx}
                      className="aspect-[2/3] min-w-[32px] invisible"
                    />
                  );
                }
                const slot = slotMap.get(colIdx)?.get(rowIdx);
                const label = `${colLabel(colIdx)}${rowIdx + 1}`;
                return slot ? (
                  <SlotCell
                    key={slot.id}
                    slot={slot}
                    label={label}
                    bottle={bottleBySlot.get(slot.id)}
                    onClick={() => onSlotClick?.(slot, bottleBySlot.get(slot.id))}
                  />
                ) : (
                  <div
                    key={rowIdx}
                    className="aspect-[2/3] min-w-[32px] border border-dashed border-stone-300 rounded opacity-30"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
