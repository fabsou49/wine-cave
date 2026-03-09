import { useDroppable } from "@dnd-kit/core";
import type { Bottle, Slot } from "../api";

interface Props {
  slot: Slot;
  bottle?: Bottle;
  onClick?: () => void;
}

export default function SlotCell({ slot, bottle, onClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.id}`,
    data: { slot },
  });

  const baseClass =
    "border rounded flex items-center justify-center transition-colors cursor-pointer select-none";
  const emptyClass = isOver
    ? "border-wine-500 bg-wine-50"
    : "border-stone-300 bg-stone-50 hover:bg-stone-100";
  const occupiedClass = "border-stone-400 bg-white hover:bg-stone-50";

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      title={slot.custom_label ?? `[${slot.row},${slot.col}]`}
      className={`${baseClass} ${bottle ? occupiedClass : emptyClass} aspect-[2/3] min-w-[40px]`}
    >
      {bottle ? (
        bottle.photo_path ? (
          <img
            src={bottle.photo_path}
            alt={bottle.domaine ?? "bouteille"}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <span className="text-lg">🍷</span>
        )
      ) : (
        <span className="text-[10px] text-stone-400 text-center leading-tight px-1">
          {slot.custom_label ?? ""}
        </span>
      )}
    </div>
  );
}
