import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  MeasuringStrategy,
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

type MobileTab = "cave" | "bottles";

export default function Cave() {
  const qc = useQueryClient();
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", defaultCols: 6, rows: 5 });
  const [rowCols, setRowCols] = useState<number[]>([6, 6, 6, 6, 6]);
  const [editingBottle, setEditingBottle] = useState<Bottle | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("cave");

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
      if (confirm(`Retirer "${bottle.domaine ?? "la bouteille"}" de ce slot ?`)) {
        await removeBottleFromSlot(bottle.id);
        qc.invalidateQueries({ queryKey: ["bottles"] });
      }
    }
  };

  const handleCreateSection = async () => {
    if (!newSection.name) return;
    try {
      const s = await createSection({
        name: newSection.name,
        rows: newSection.rows,
        cols: newSection.defaultCols,
        row_cols: rowCols,
      });
      qc.invalidateQueries({ queryKey: ["sections"] });
      setSelectedSectionId(s.id);
      setShowCreate(false);
      setNewSection({ name: "", defaultCols: 6, rows: 5 });
      setRowCols([6, 6, 6, 6, 6]);
      toast.success("Section créée");
    } catch {
      toast.error("Erreur création section");
    }
  };

  // When row count changes, rebuild rowCols (keep existing values, pad with default)
  const handleRowsChange = (rows: number) => {
    const clamped = Math.max(1, Math.min(30, rows));
    setNewSection((n) => ({ ...n, rows: clamped }));
    setRowCols((prev) => {
      const next = Array(clamped).fill(newSection.defaultCols);
      for (let i = 0; i < Math.min(prev.length, clamped); i++) next[i] = prev[i];
      return next;
    });
  };

  // When default cols changes, reset all rows to that value
  const handleDefaultColsChange = (cols: number) => {
    const clamped = Math.max(1, Math.min(30, cols));
    setNewSection((n) => ({ ...n, defaultCols: clamped }));
    setRowCols(Array(newSection.rows).fill(clamped));
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

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500";

  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragEnd={handleDragEnd}
    >
      {/* ── Mobile tab switcher ── */}
      <div className="sm:hidden flex rounded-xl bg-stone-200 p-1 mb-3">
        <button
          onClick={() => setMobileTab("cave")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === "cave" ? "bg-white text-wine-700 shadow-sm" : "text-stone-500"
          }`}
        >
          🍷 Cave
        </button>
        <button
          onClick={() => setMobileTab("bottles")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === "bottles" ? "bg-white text-wine-700 shadow-sm" : "text-stone-500"
          }`}
        >
          À placer{unplacedBottles.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-wine-600 text-white rounded-full">
              {unplacedBottles.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop layout: side by side ── */}
      <div className="hidden sm:flex gap-5 h-[calc(100vh-110px)]">
        <DesktopCavePanel
          sections={sections}
          selectedSection={selectedSection}
          slots={slots}
          bottles={bottles}
          onSelectSection={setSelectedSectionId}
          onCreateClick={() => setShowCreate(true)}
          onPhotoUpload={handlePhotoUpload}
          onDeleteSection={handleDeleteSection}
          onSlotClick={handleSlotClick}
        />
        <div className="w-64 flex flex-col gap-2 overflow-hidden">
          <h2 className="text-sm font-semibold text-stone-600 shrink-0">
            À placer ({unplacedBottles.length})
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {unplacedBottles.length === 0 ? (
              <p className="text-xs text-stone-400 text-center pt-6">Toutes les bouteilles sont placées</p>
            ) : (
              unplacedBottles.map((b) => (
                <BottleCard key={b.id} bottle={b} onClick={() => setEditingBottle(b)} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: Cave tab ── */}
      {mobileTab === "cave" && (
        <div className="sm:hidden flex flex-col gap-3">
          {/* Section selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSectionId(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedSection?.id === s.id
                    ? "bg-wine-600 text-white"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {s.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-500 border border-dashed border-stone-300 whitespace-nowrap shrink-0"
            >
              + Section
            </button>
          </div>

          {selectedSection ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500">{selectedSection.rows} × {selectedSection.cols} empl.</span>
                <div className="flex gap-2">
                  <label className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1.5 rounded-lg cursor-pointer active:bg-stone-200">
                    Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(selectedSection, file);
                    }} />
                  </label>
                  <button
                    onClick={() => handleDeleteSection(selectedSection)}
                    className="text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg active:bg-red-50"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3">
                <div className="px-3">
                  <CaveView section={selectedSection} slots={slots} bottles={bottles} onSlotClick={handleSlotClick} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-400 py-16 text-sm">
              <p>Créez une section pour commencer.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile: Bottles tab ── */}
      {mobileTab === "bottles" && (
        <div className="sm:hidden">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">
            Bouteilles à placer ({unplacedBottles.length})
          </h2>
          {unplacedBottles.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-12">Toutes les bouteilles sont placées 🎉</p>
          ) : (
            <div className="space-y-2">
              {unplacedBottles.map((b) => (
                <BottleCard key={b.id} bottle={b} onClick={() => setEditingBottle(b)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create section modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100 shrink-0">
              <h2 className="text-base font-bold text-wine-700">Nouvelle section</h2>
              <button onClick={() => setShowCreate(false)} className="text-stone-400 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase tracking-wide">Nom</label>
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(e) => setNewSection((n) => ({ ...n, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex: Casier principal"
                  autoFocus
                />
              </div>

              {/* Global settings */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase tracking-wide">Rangées</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newSection.rows}
                    onChange={(e) => handleRowsChange(parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase tracking-wide">Empl. (défaut)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newSection.defaultCols}
                    onChange={(e) => handleDefaultColsChange(parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Per-row slot counts */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">
                  Emplacements par rangée
                </label>
                <div className="flex flex-col gap-2">
                  {rowCols.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-stone-500 w-14 shrink-0">
                        Rangée {i + 1}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={c}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                          setRowCols((prev) => prev.map((v, idx) => idx === i ? val : v));
                        }}
                        className="w-20 border border-stone-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-wine-500"
                      />
                      <div className="flex gap-0.5">
                        {Array.from({ length: c }, (_, ci) => (
                          <div key={ci} className="w-2 h-3 bg-wine-300 rounded-sm" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-3">
                  Total : {rowCols.reduce((a, b) => a + b, 0)} emplacements
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-stone-100 shrink-0">
              <button onClick={handleCreateSection} className="flex-1 bg-wine-600 text-white rounded-xl px-4 py-3 text-sm font-semibold active:bg-wine-700">
                Créer
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-3 text-sm text-stone-600 bg-stone-100 rounded-xl active:bg-stone-200">
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

// ── Extracted desktop cave panel ──────────────────────────────────────────────
interface DesktopCavePanelProps {
  sections: Section[];
  selectedSection: Section | null;
  slots: Slot[];
  bottles: Bottle[];
  onSelectSection: (id: number) => void;
  onCreateClick: () => void;
  onPhotoUpload: (s: Section, file: File) => void;
  onDeleteSection: (s: Section) => void;
  onSlotClick: (slot: Slot, bottle?: Bottle) => void;
}

function DesktopCavePanel({
  sections, selectedSection, slots, bottles,
  onSelectSection, onCreateClick, onPhotoUpload, onDeleteSection, onSlotClick,
}: DesktopCavePanelProps) {
  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 flex-wrap">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSection(s.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSection?.id === s.id ? "bg-wine-600 text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={onCreateClick}
          className="px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-500 hover:bg-stone-200 border border-dashed border-stone-300"
        >
          + Nouvelle section
        </button>
      </div>

      {selectedSection ? (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-600">{selectedSection.rows} × {selectedSection.cols} emplacements</span>
            <div className="flex gap-2">
              <label className="text-xs bg-stone-100 text-stone-600 px-3 py-1.5 rounded cursor-pointer hover:bg-stone-200">
                Photo fond
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoUpload(selectedSection, file);
                }} />
              </label>
              <button
                onClick={() => onDeleteSection(selectedSection)}
                className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          </div>
          <CaveView section={selectedSection} slots={slots} bottles={bottles} onSlotClick={onSlotClick} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-stone-400">
          <p>Créez une section pour commencer.</p>
        </div>
      )}
    </div>
  );
}
