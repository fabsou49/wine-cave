import type { Section, Slot, Bottle } from "../api";
import SlotCell from "./SlotCell";

interface Props {
  section: Section;
  slots: Slot[];
  bottles: Bottle[];
  onSlotClick?: (slot: Slot, bottle?: Bottle) => void;
}

// 0→A, 1→B, …, 25→Z, 26→AA…
function colLabel(idx: number): string {
  let label = "";
  let n = idx;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

// Fixed slot dimensions (px) — used on both SlotCell wrapper and axis labels
const SLOT_W = 40;
const SLOT_H = 56; // ~2:3 ratio
const GAP = 4;
const ROW_LABEL_W = 24;
const COL_LABEL_H = 24;

export default function CaveView({ section, slots, bottles, onSlotClick }: Props) {
  // Resolve per-row slot counts
  const rowCols: number[] = section.row_cols
    ? JSON.parse(section.row_cols)
    : Array(section.rows).fill(section.cols);

  const maxCols = Math.max(...rowCols, 1);

  // Index bottles by slot id
  const bottleBySlot = new Map<number, Bottle>();
  for (const b of bottles) {
    if (b.slot_id != null) bottleBySlot.set(b.slot_id, b);
  }

  // Index slots by row → col
  const slotMap = new Map<number, Map<number, Slot>>();
  for (const slot of slots) {
    if (!slotMap.has(slot.row)) slotMap.set(slot.row, new Map());
    slotMap.get(slot.row)!.set(slot.col, slot);
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

      {/* Scrollable wrapper — outside DnD drop targets so coordinates stay accurate */}
      <div className="relative p-2 overflow-auto">
        {/* Row-label column + main grid side by side */}
        <div className="flex" style={{ gap: GAP }}>

          {/* ── Left axis: row numbers ── */}
          <div className="flex flex-col shrink-0" style={{ gap: GAP }}>
            {/* Corner spacer aligned with column header row */}
            <div style={{ height: COL_LABEL_H }} />
            {rowCols.map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="flex items-center justify-center rounded bg-black/10"
                style={{ width: ROW_LABEL_W, height: SLOT_H }}
              >
                <span className="text-[11px] font-bold text-white drop-shadow">
                  {rowIdx + 1}
                </span>
              </div>
            ))}
          </div>

          {/* ── Main grid: column headers + rows ── */}
          <div className="flex flex-col" style={{ gap: GAP }}>
            {/* Column headers A B C … */}
            <div className="flex" style={{ gap: GAP }}>
              {Array.from({ length: maxCols }, (_, ci) => (
                <div
                  key={ci}
                  className="flex items-center justify-center rounded bg-black/10"
                  style={{ width: SLOT_W, height: COL_LABEL_H }}
                >
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    {colLabel(ci)}
                  </span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {rowCols.map((numCols, rowIdx) => (
              <div key={rowIdx} className="flex" style={{ gap: GAP }}>
                {Array.from({ length: maxCols }, (_, colIdx) => {
                  // Invisible spacer beyond this row's width
                  if (colIdx >= numCols) {
                    return (
                      <div
                        key={colIdx}
                        style={{ width: SLOT_W, height: SLOT_H }}
                        className="invisible"
                      />
                    );
                  }

                  const slot = slotMap.get(rowIdx)?.get(colIdx);
                  const label = `${colLabel(colIdx)}${rowIdx + 1}`;

                  if (!slot) {
                    return (
                      <div
                        key={colIdx}
                        style={{ width: SLOT_W, height: SLOT_H }}
                        className="border border-dashed border-stone-300 rounded opacity-40"
                      />
                    );
                  }

                  return (
                    <SlotCell
                      key={slot.id}
                      slot={slot}
                      label={label}
                      bottle={bottleBySlot.get(slot.id)}
                      width={SLOT_W}
                      height={SLOT_H}
                      onClick={() => onSlotClick?.(slot, bottleBySlot.get(slot.id))}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
