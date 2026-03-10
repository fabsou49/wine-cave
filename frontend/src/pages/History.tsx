import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBottlesHistory, deleteBottle } from "../api";
import type { Bottle } from "../api";
import LabelForm from "../components/LabelForm";

export default function History() {
  const qc = useQueryClient();
  const { data: bottles = [], isLoading } = useQuery({
    queryKey: ["bottles-history"],
    queryFn: getBottlesHistory,
  });
  const [editing, setEditing] = useState<Bottle | null>(null);

  const handleDelete = async (b: Bottle) => {
    if (!confirm(`Supprimer définitivement "${b.domaine ?? "cette bouteille"}" de l'historique ?`)) return;
    try {
      await deleteBottle(b.id);
      qc.invalidateQueries({ queryKey: ["bottles-history"] });
      toast.success("Bouteille supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-wine-700">Historique</h1>
        {!isLoading && bottles.length > 0 && (
          <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-medium">
            {bottles.length}
          </span>
        )}
      </div>
      <p className="text-xs text-stone-400">Bouteilles consommées ou offertes.</p>

      {isLoading ? (
        <p className="text-stone-500 text-center py-10">Chargement…</p>
      ) : bottles.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🍷</p>
          <p className="text-stone-400 text-sm">Aucune bouteille dans l'historique.</p>
          <p className="text-stone-400 text-xs">Les bouteilles marquées "Consommée / Offerte" apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bottles.map((b) => (
            <div key={b.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex gap-3 p-3">
              {b.photo_path ? (
                <img
                  src={b.photo_path}
                  alt={b.domaine ?? "bouteille"}
                  className="w-16 h-20 object-contain bg-stone-50 rounded-xl shrink-0"
                />
              ) : (
                <div className="w-16 h-20 bg-stone-50 rounded-xl flex items-center justify-center text-3xl shrink-0">🍷</div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-stone-800 text-sm line-clamp-1">
                    {b.domaine || <span className="text-stone-400 italic">Sans nom</span>}
                  </p>
                  {(b.appellation || b.cepage || b.millesime) && (
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {[b.appellation, b.cepage, b.millesime].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {b.obtention_detail && (
                    <p className="text-xs text-stone-400 line-clamp-1">📦 {b.obtention_detail}</p>
                  )}
                  {b.commentaire_consommation && (
                    <p className="text-xs text-stone-500 italic line-clamp-2 mt-1 bg-stone-50 rounded-lg px-2 py-1">
                      "{b.commentaire_consommation}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditing(b)}
                    className="text-xs text-wine-600 border border-wine-200 rounded-lg px-3 py-1.5 active:bg-wine-50"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 active:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <LabelForm
          bottle={editing}
          onClose={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["bottles-history"] });
          }}
        />
      )}
    </div>
  );
}
