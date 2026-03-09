import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getSettings, saveSettings } from "../api";

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [host, setHost] = useState("");
  const [saving, setSaving] = useState(false);

  const displayHost = host !== "" ? host : (settings?.ollama_host ?? "");

  const handleSave = async () => {
    if (!displayHost.trim()) {
      toast.error("L'adresse ne peut pas être vide");
      return;
    }
    setSaving(true);
    try {
      await saveSettings(displayHost.trim());
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configuration sauvegardée");
      setHost("");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = settings?.has_env_host || !!settings?.ollama_host;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-wine-700">Paramètres</h1>

      {/* Ollama host form */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Serveur Ollama</h2>
          {!isLoading && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                isConfigured
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isConfigured
                ? settings?.has_env_host
                  ? "Configuré (variable d'env)"
                  : "Configuré"
                : "Non configuré"}
            </span>
          )}
        </div>

        <p className="text-sm text-stone-600">
          Adresse du serveur Ollama qui héberge le modèle <code>llama3.2-vision</code>.
          Installer Ollama depuis{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noreferrer"
            className="text-wine-600 underline hover:text-wine-700"
          >
            ollama.com
          </a>
          , puis lancer : <code className="bg-stone-100 px-1 rounded">ollama pull llama3.2-vision</code>
        </p>

        {settings?.has_env_host && (
          <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded p-3">
            L'adresse est définie via la variable d'environnement <code>OLLAMA_HOST</code> — elle est prioritaire sur la valeur ci-dessous.
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={displayHost}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://localhost:11434"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-wine-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-wine-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-wine-700 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>

        {isConfigured && !settings?.has_env_host && (
          <p className="text-xs text-stone-400">
            La configuration est stockée dans <code>data/settings.json</code> et persiste entre les redémarrages.
          </p>
        )}
      </section>

      {/* Synology deployment */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">Déploiement NAS Synology</h2>
        <ol className="text-sm text-stone-600 space-y-2 list-decimal list-inside">
          <li>
            Placer le dossier dans{" "}
            <code className="bg-stone-100 px-1 rounded">/volume1/docker/wine-cave/</code>
          </li>
          <li>
            Container Manager → Projet → pointer sur le dossier → Build
          </li>
          <li>
            Accéder via <code className="bg-stone-100 px-1 rounded">http://nas-ip:8080</code>
          </li>
          <li>Saisir l'adresse Ollama directement dans cet écran</li>
        </ol>
        <p className="text-xs text-stone-400">
          Reverse proxy HTTPS : DSM → Portail de connexion → Proxy inversé → pointer sur <code>localhost:8080</code>.
          Éviter les ports 80, 443, 5000, 5001.
        </p>
      </section>

      {/* Data */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Données</h2>
        <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
          <li><code>data/cave.db</code> — Base de données SQLite</li>
          <li><code>data/settings.json</code> — Configuration (adresse Ollama)</li>
          <li><code>data/uploads/bottles/</code> — Photos d'étiquettes</li>
          <li><code>data/uploads/sections/</code> — Photos de fond des sections</li>
        </ul>
      </section>
    </div>
  );
}
