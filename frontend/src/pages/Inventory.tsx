import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBottles, uploadBottle, deleteBottle } from "../api";
import type { Bottle } from "../api";
import LabelForm from "../components/LabelForm";

export default function Inventory() {
  const qc = useQueryClient();
  const { data: bottles = [], isLoading } = useQuery({
    queryKey: ["bottles"],
    queryFn: getBottles,
  });
  const [editing, setEditing] = useState<Bottle | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploadProgress({ done: 0, total: files.length });
      await new Promise((r) => setTimeout(r, 50));
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          await uploadBottle(file);
          toast.success(`${file.name} importé`);
        } catch {
          toast.error(`Erreur pour ${file.name}`);
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

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) processFiles(files);
    e.target.value = "";
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
      <h1 className="text-2xl font-bold text-wine-700">Inventaire</h1>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleCameraChange}
      />

      <div className="sm:hidden grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={!!uploadProgress}
          className="flex flex-col items-center justify-center gap-2 bg-wine-600 text-white rounded-xl py-5 font-semibold shadow-md active:bg-wine-700 disabled:opacity-50"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm">Appareil photo</span>
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={!!uploadProgress}
          className="flex flex-col items-center justify-center gap-2 bg-stone-700 text-white rounded-xl py-5 font-semibold shadow-md active:bg-stone-800 disabled:opacity-50"
        >
          <span className="text-3xl">🖼️</span>
          <span className="text-sm">Photothèque</span>
        </button>
      </div>

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

      {uploadProgress && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
          <div className="flex justify-between text-sm text-stone-600">
            <span>Import en cours…</span>
            <span className="font-medium">{uploadProgress.done}/{uploadProgress.total} photo{uploadProgress.total > 1 ? "s" : ""}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3">
            <div
              className="bg-wine-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-stone-400 text-right">{percent}%</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-stone-500 text-center py-10">Chargement…</p>
      ) : bottles.length === 0 ? (
        <p className="text-stone-500 text-center py-10">
          Aucune bouteille.{" "}
          <span className="sm:hidden">Photographiez une étiquette ci-dessus.</span>
          <span className="hidden sm:inline">Importez des photos ci-dessus.</span>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {bottles.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm"
            >
              {b.photo_path && (
                <img
                  src={b.photo_path}
                  alt={b.domaine ?? "bouteille"}
                  className="w-full h-36 object-contain bg-stone-50"
                />
              )}
              <div className="p-3 space-y-1">
                <p className="font-semibold text-stone-800 text-sm truncate">
                  {b.domaine || <span className="text-stone-400 italic">Inconnu</span>}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {[b.appellation, b.cepage, b.millesime].filter(Boolean).join(" · ")}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {!b.label_verified && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">À vérifier</span>
                  )}
                  {b.slot_id && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">En cave</span>
                  )}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => setEditing(b)}
                    className="flex-1 text-xs bg-wine-600 text-white rounded-lg px-2 py-2 active:bg-wine-700"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-2 active:bg-red-50"
                  >
                    Supprimer
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
