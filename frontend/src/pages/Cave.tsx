import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import toast from "react-hot-toast";
import {
  getSections,
  getSectionSlots,
  getBottles,
  createSection,
  deleteSection,
  uploadSectionPhoto,
  placeBottle,
  removeBottleFromSlot,
} from "../api";
import type { Section, Slot, Bottle } from "../api";
import CaveView from "../components/CaveView";
import BottleCard from "../components/BottleCard";
import LabelForm from "../components/LabelForm";

export default function Cave() {
  const qc = useQueryClient();
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", rows: 5, cols: 10 });
  const [editingBottle, setEditingBottle] = useState<Bottle | null>(null);

  const { data: sections = [] } = useQuery({ queryKey: ["sections"], queryFn: getSections });
  const { data: bottles = [] } = useQuery({ queryKey: ["bottles"], queryFn: getBottles });
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? sections[0] ?? null;

  const { data: slots = [] } = useQuery({
    queryKey: ["slots", selectedSection?.id],
    queryFn: () => getSectionSlots(selectedSection!.id),
    enabled: !!selectedSection,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const unplacedBottles = bottles.filter((b) => b.slot_id == null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const bottleId = parseInt((active.id as string).replace("bottle-", ""));
    const slotId = parseInt((over.id as string).replace("slot-", ""));

    if (isNaN(bottleId) || isNaN(slotId)) return;

    try {
      await placeBottle(bottleId, slotId);
      qc.invalidateQueries({ queryKey: ["bottles"] });
      toast.success("Bouteille placée");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur placement");
    }
  };

  const handleSlotClick = async (slot: Slot, bottle?: Bottle) => {
    if (bottle) {
      if (confirm(`Retirer la bouteille "${bottle.domaine ?? bottle.id}" du slot ?`)) {
        await removeBottleFromSlot(bottle.id);
        qc.invalidateQueries({ queryKey: ["bottles"] });
      }
    }
  };

  const handleCreateSection = async () => {
    if (!newSection.name) return;
    try {
      const s = await createSection(newSection);
      qc.invalidateQueries({ queryKey: ["sections"] });
      setSelectedSectionId(s.id);
      setShowCreate(false);
      setNewSection({ name: "", rows: 5, cols: 10 });
      toast.success("Section créée");
    } catch {
      toast.error("Erreur création section");
    }
  };

  const handleDeleteSection = async (s: Section) => {
    if (!confirm(`Supprimer la section "${s.name}" ?`)) return;
    try {
      await deleteSection(s.id);
      qc.invalidateQueries({ queryKey: ["sections"] });
      setSelectedSectionId(null);
      toast.success("Section supprimée");
    } catch {
      toast.error("Erreur suppression");
    }
  };

  const handlePhotoUpload = async (s: Section, file: File) => {
    try {
      await uploadSectionPhoto(s.id, file);
      qc.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Photo de fond mise à jour");
    } catch {
      toast.error("Erreur upload photo");
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        {/* Left: Section selector + cave grid */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Section bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSectionId(s.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedSection?.id === s.id
                    ? "bg-wine-600 text-white"
                    : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                }`}
              >
                {s.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-500 hover:bg-stone-200 border border-dashed border-stone-300"
            >
              + Nouvelle section
            </button>
          </div>

          {selectedSection ? (
            <div className="flex-1 overflow-auto">
              {/* Section actions */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">
                  {selectedSection.rows} × {selectedSection.cols} emplacements
                </span>
                <div className="flex gap-2">
                  <label className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded cursor-pointer hover:bg-stone-200">
                    Photo fond
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(selectedSection, file);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => handleDeleteSection(selectedSection)}
                    className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <CaveView
                section={selectedSection}
                slots={slots}
                bottles={bottles}
                onSlotClick={handleSlotClick}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-400">
              <p>Créez une section pour commencer.</p>
            </div>
          )}
        </div>

        {/* Right: Unplaced bottles sidebar */}
        <div className="w-64 flex flex-col gap-2 overflow-hidden">
          <h2 className="text-sm font-semibold text-stone-600">
            Bouteilles non placées ({unplacedBottles.length})
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {unplacedBottles.length === 0 ? (
              <p className="text-xs text-stone-400 text-center pt-6">
                Toutes les bouteilles sont placées
              </p>
            ) : (
              unplacedBottles.map((b) => (
                <BottleCard
                  key={b.id}
                  bottle={b}
                  onClick={() => setEditingBottle(b)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create section modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-wine-700">Nouvelle section</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Nom</label>
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(e) => setNewSection((n) => ({ ...n, name: e.target.value }))}
                  className="w-full border border-stone-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
                  placeholder="Ex: Casier principal"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Rangées</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newSection.rows}
                    onChange={(e) => setNewSection((n) => ({ ...n, rows: parseInt(e.target.value) }))}
                    className="w-full border border-stone-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Colonnes</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newSection.cols}
                    onChange={(e) => setNewSection((n) => ({ ...n, cols: parseInt(e.target.value) }))}
                    className="w-full border border-stone-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleCreateSection}
                className="flex-1 bg-wine-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-wine-700"
              >
                Créer
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBottle && (
        <LabelForm bottle={editingBottle} onClose={() => setEditingBottle(null)} />
      )}
    </DndContext>
  );
}
