import { useDroppable } from "@dnd-kit/core";
import type { Bottle, Slot } from "../api";

interface Props {
  slot: Slot;
  bottle?: Bottle;
  label: string;   // e.g. "A1", "B3"
  width: number;
  height: number;
  onClick?: () => void;
}

export default function SlotCell({ slot, bottle, label, width, height, onClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.id}`,
    data: { slot },
  });

  const base = "border rounded flex items-center justify-center transition-colors cursor-pointer select-none overflow-hidden";
  const empty = isOver ? "border-wine-500 bg-wine-50" : "border-stone-300 bg-stone-50/80 hover:bg-stone-100";
  const occupied = "border-stone-400 bg-white hover:bg-stone-50";

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      title={slot.custom_label ?? label}
      className={`${base} ${bottle ? occupied : empty}`}
      style={{ width, height }}
    >
      {bottle ? (
        bottle.photo_path ? (
          <img
            src={bottle.photo_path}
            alt={bottle.domaine ?? "bouteille"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg">🍷</span>
        )
      ) : (
        <span className="text-[9px] text-stone-400 text-center leading-tight px-0.5">
          {slot.custom_label ?? ""}
        </span>
      )}
    </div>
  );
}
