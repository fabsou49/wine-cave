import { useState } from "react";
import toast from "react-hot-toast";
import type { Bottle } from "../api";
import { updateBottle } from "../api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  bottle: Bottle;
  onClose: () => void;
}

export default function LabelForm({ bottle, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    domaine: bottle.domaine ?? "",
    cepage: bottle.cepage ?? "",
    appellation: bottle.appellation ?? "",
    millesime: bottle.millesime?.toString() ?? "",
    taille: bottle.taille ?? "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      await updateBottle(bottle.id, {
        domaine: form.domaine || null,
        cepage: form.cepage || null,
        appellation: form.appellation || null,
        millesime: form.millesime ? parseInt(form.millesime) : null,
        taille: form.taille || null,
        label_verified: true,
      });
      qc.invalidateQueries({ queryKey: ["bottles"] });
      toast.success("Étiquette sauvegardée");
      onClose();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-wine-700">Éditer l'étiquette</h2>

        {bottle.photo_path && (
          <img
            src={bottle.photo_path}
            alt="étiquette"
            className="w-full h-40 object-contain rounded mb-4 bg-stone-50"
          />
        )}

        <div className="space-y-3">
          {[
            { label: "Domaine", field: "domaine" },
            { label: "Cépage", field: "cepage" },
            { label: "Appellation", field: "appellation" },
            { label: "Taille", field: "taille" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={set(field)}
                className="w-full border border-stone-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Millésime</label>
            <input
              type="number"
              value={form.millesime}
              onChange={set("millesime")}
              className="w-full border border-stone-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            className="flex-1 bg-wine-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-wine-700"
          >
            Sauvegarder
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
