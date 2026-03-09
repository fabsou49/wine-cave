import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Bottle } from "../api";

interface Props {
  bottle: Bottle;
  onClick?: () => void;
}

export default function BottleCard({ bottle, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bottle-${bottle.id}`,
    data: { bottle },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const label = bottle.domaine || bottle.appellation || `Bouteille #${bottle.id}`;
  const sub = [bottle.cepage, bottle.millesime].filter(Boolean).join(" · ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg p-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      {bottle.photo_path ? (
        <img
          src={bottle.photo_path}
          alt={label}
          className="w-10 h-14 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-14 bg-wine-100 rounded flex items-center justify-center text-wine-500 text-lg">
          🍷
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-800 truncate">{label}</p>
        {sub && <p className="text-xs text-stone-500 truncate">{sub}</p>}
        {!bottle.label_verified && (
          <span className="text-[10px] text-amber-600 font-medium">À vérifier</span>
        )}
      </div>
    </div>
  );
}
