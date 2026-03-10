import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBottles, uploadBottle, deleteBottle, analyzeBottle } from "../api";
import type { Bottle } from "../api";
import LabelForm from "../components/LabelForm";

const STATUT_BADGE: Record<string, string> = {
  "à ranger": "bg-amber-100 text-amber-700",
  "en cave": "bg-emerald-100 text-emerald-700",
};

export default function Inventory() {
  const qc = useQueryClient();
  const { data: bottles = [], isLoading } = useQuery({
    queryKey: ["bottles"],
    queryFn: getBottles,
  });
  const [editing, setEditing] = useState<Bottle | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploadProgress({ done: 0, total: files.length });
      await new Promise((r) => setTimeout(r, 50));
      for (let i = 0; i < files.length; i++) {
        try {
          await uploadBottle(files[i]);
          toast.success(`${files[i].name} importé`);
        } catch {
          toast.error(`Erreur pour ${files[i].name}`);
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }
      qc.invalidateQueries({ queryKey: ["bottles"] });
      await new Promise((r) => setTimeout(r, 800));
      setUploadProgress(null);
    },
    [qc]
  );

  const onDrop = useCallback((files: File[]) => processFiles(files), [processFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) processFiles(files);
    e.target.value = "";
  };

  const handleAnalyze = async (b: Bottle) => {
    setAnalyzing(b.id);
    try {
      const updated = await analyzeBottle(b.id);
      qc.invalidateQueries({ queryKey: ["bottles"] });
      toast.success(`Étiquette analysée ✨`);
      setEditing(updated); // open LabelForm so user can review/adjust
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur analyse";
      if (msg.includes("503") || msg.includes("API_KEY")) {
        toast.error("Clé GEMINI_API_KEY non configurée");
      } else {
        toast.error("Erreur analyse — réessayez");
      }
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (b: Bottle) => {
    if (!confirm(`Supprimer "${b.domaine ?? "cette bouteille"}" ?`)) return;
    try {
      await deleteBottle(b.id);
      qc.invalidateQueries({ queryKey: ["bottles"] });
      toast.success("Bouteille supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const percent = uploadProgress
    ? Math.round((uploadProgress.done / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-wine-700">Inventaire</h1>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {/* Mobile upload buttons */}
      <div className="sm:hidden grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={!!uploadProgress}
          className="flex flex-col items-center justify-center gap-2 bg-wine-600 text-white rounded-2xl py-5 font-semibold shadow active:bg-wine-700 disabled:opacity-50"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm">Photo</span>
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={!!uploadProgress}
          className="flex flex-col items-center justify-center gap-2 bg-stone-700 text-white rounded-2xl py-5 font-semibold shadow active:bg-stone-800 disabled:opacity-50"
        >
          <span className="text-3xl">🖼️</span>
          <span className="text-sm">Galerie</span>
        </button>
      </div>

      {/* Desktop drag zone */}
      <div
        {...getRootProps()}
        className={`hidden sm:flex border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors items-center justify-center min-h-[100px] ${
          isDragActive ? "border-wine-500 bg-wine-50" : "border-stone-300 hover:border-wine-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-wine-600 font-medium">Déposez les photos ici…</p>
        ) : (
          <div>
            <p className="text-stone-600 mb-1">Glissez des photos d'étiquettes ici</p>
            <p className="text-xs text-stone-400">ou cliquez pour sélectionner</p>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
          <div className="flex justify-between text-sm text-stone-600">
            <span>Import en cours…</span>
            <span className="font-medium">{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2.5">
            <div className="bg-wine-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {/* Bottle count */}
      {!isLoading && bottles.length > 0 && (
        <p className="text-xs text-stone-400 font-medium">{bottles.length} bouteille{bottles.length > 1 ? "s" : ""}</p>
      )}

      {/* Bottle grid */}
      {isLoading ? (
        <p className="text-stone-500 text-center py-10">Chargement…</p>
      ) : bottles.length === 0 ? (
        <p className="text-stone-400 text-center py-12 text-sm">
          Aucune bouteille.{" "}
          <span className="sm:hidden">Photographiez une étiquette ci-dessus.</span>
          <span className="hidden sm:inline">Importez des photos ci-dessus.</span>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {bottles.map((b) => (
            <div key={b.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {b.photo_path ? (
                <img
                  src={b.photo_path}
                  alt={b.domaine ?? "bouteille"}
                  className="w-full h-32 object-contain bg-stone-50"
                />
              ) : (
                <div className="w-full h-32 bg-stone-50 flex items-center justify-center text-4xl">🍷</div>
              )}
              <div className="p-3 flex flex-col flex-1 gap-1">
                <p className="font-semibold text-stone-800 text-sm leading-tight line-clamp-1">
                  {b.domaine || <span className="text-stone-400 italic text-xs">Sans nom</span>}
                </p>
                {(b.appellation || b.millesime) && (
                  <p className="text-xs text-stone-500 line-clamp-1">
                    {[b.appellation, b.millesime].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {!b.label_verified && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">À vérifier</span>
                  )}
                  {b.statut === "en cave" && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">En cave</span>
                  )}
                  {b.statut === "à ranger" && b.label_verified && (
                    <span className="text-[10px] bg-stone-100 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded-full">À ranger</span>
                  )}
                </div>
                <div className="flex gap-1.5 mt-auto pt-2">
                  {b.photo_path && (
                    <button
                      onClick={() => handleAnalyze(b)}
                      disabled={analyzing === b.id}
                      className="text-xs bg-amber-500 text-white rounded-xl px-2 py-2 font-medium active:bg-amber-600 disabled:opacity-50"
                      title="Analyser avec l'IA"
                    >
                      {analyzing === b.id ? "⏳" : "✨"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(b)}
                    className="flex-1 text-xs bg-wine-600 text-white rounded-xl py-2 font-medium active:bg-wine-700"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="text-xs text-red-500 border border-red-200 rounded-xl px-3 py-2 active:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <LabelForm bottle={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
