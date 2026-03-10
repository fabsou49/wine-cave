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
    obtention_detail: bottle.obtention_detail ?? "",
    statut: bottle.statut ?? "à ranger",
    commentaire_consommation: bottle.commentaire_consommation ?? "",
  });

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      await updateBottle(bottle.id, {
        domaine: form.domaine || null,
        cepage: form.cepage || null,
        appellation: form.appellation || null,
        millesime: form.millesime ? parseInt(form.millesime) : null,
        taille: form.taille || null,
        label_verified: true,
        obtention_detail: form.obtention_detail || null,
        statut: form.statut as Bottle["statut"],
        commentaire_consommation:
          form.statut === "consommé/offerte"
            ? form.commentaire_consommation || null
            : null,
      });
      qc.invalidateQueries({ queryKey: ["bottles"] });
      qc.invalidateQueries({ queryKey: ["bottles-history"] });
      toast.success("Étiquette sauvegardée");
      onClose();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const inputCls =
    "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 bg-white";
  const labelCls = "block text-xs font-semibold text-stone-500 mb-1 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100 shrink-0">
          <h2 className="text-base font-bold text-wine-700">Éditer la bouteille</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {bottle.photo_path && (
            <img
              src={bottle.photo_path}
              alt="étiquette"
              className="w-full h-36 object-contain rounded-xl bg-stone-50"
            />
          )}

          {/* Wine info */}
          <div className="space-y-3">
            {[
              { label: "Domaine", field: "domaine" },
              { label: "Appellation", field: "appellation" },
              { label: "Cépage", field: "cepage" },
              { label: "Taille", field: "taille" },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className={labelCls}>{label}</label>
                <input
                  type="text"
                  value={form[field as keyof typeof form]}
                  onChange={set(field)}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className={labelCls}>Millésime</label>
              <input
                type="number"
                value={form.millesime}
                onChange={set("millesime")}
                className={inputCls}
                placeholder="Ex: 2019"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* Obtention */}
          <div>
            <label className={labelCls}>Détail de l'obtention</label>
            <input
              type="text"
              value={form.obtention_detail}
              onChange={set("obtention_detail")}
              className={inputCls}
              placeholder="Ex: Achat domaine, cadeau, enchères…"
            />
          </div>

          {/* Statut */}
          <div>
            <label className={labelCls}>Statut</label>
            <select
              value={form.statut}
              onChange={set("statut")}
              className={inputCls}
            >
              <option value="à ranger">À ranger</option>
              <option value="en cave" disabled={!bottle.slot_id}>
                En cave{!bottle.slot_id ? " (non placée)" : ""}
              </option>
              <option value="consommé/offerte">Consommée / Offerte</option>
            </select>
          </div>

          {/* Comment if consumed */}
          {form.statut === "consommé/offerte" && (
            <div>
              <label className={labelCls}>Commentaire</label>
              <textarea
                value={form.commentaire_consommation}
                onChange={set("commentaire_consommation")}
                rows={3}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 bg-white resize-none"
                placeholder="Notes de dégustation, occasion, avec qui…"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={handleSave}
            className="flex-1 bg-wine-600 text-white rounded-xl px-4 py-3 text-sm font-semibold active:bg-wine-700"
          >
            Sauvegarder
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm text-stone-600 bg-stone-100 rounded-xl active:bg-stone-200"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
