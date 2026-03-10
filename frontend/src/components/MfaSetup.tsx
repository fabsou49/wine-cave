import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getMfaStatus, getMfaSetup, enableMfa, disableMfa } from "../api";

interface Props {
  onClose: () => void;
}

export default function MfaSetup({ onClose }: Props) {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["mfa-status"], queryFn: getMfaStatus });
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500";

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await getMfaSetup();
      setSetupData(data);
      setStep("setup");
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setLoading(true);
    try {
      await enableMfa(setupData.secret, code);
      qc.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("MFA activé");
      setStep("idle");
      setCode("");
    } catch {
      toast.error("Code incorrect — réessayez");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await disableMfa(code);
      qc.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("MFA désactivé");
      setStep("idle");
      setCode("");
    } catch {
      toast.error("Code incorrect");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = status?.enabled ?? false;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐</span>
            <h2 className="text-base font-bold text-wine-700">Double authentification</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5">
          {/* ── Idle state ── */}
          {step === "idle" && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isEnabled ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50 border border-stone-200"}`}>
                <span className="text-2xl">{isEnabled ? "✅" : "⚪"}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {isEnabled ? "MFA activé" : "MFA désactivé"}
                  </p>
                  <p className="text-xs text-stone-500">
                    {isEnabled ? "Votre compte est protégé par TOTP." : "Protégez votre compte avec une app d'authentification."}
                  </p>
                </div>
              </div>

              {!isEnabled ? (
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="w-full bg-wine-600 text-white rounded-xl py-3 font-semibold text-sm active:bg-wine-700 disabled:opacity-50"
                >
                  {loading ? "Chargement…" : "Activer le MFA"}
                </button>
              ) : (
                <button
                  onClick={() => setStep("disable")}
                  className="w-full border border-red-200 text-red-600 rounded-xl py-3 font-semibold text-sm active:bg-red-50"
                >
                  Désactiver le MFA
                </button>
              )}
            </div>
          )}

          {/* ── Setup: scan QR + confirm ── */}
          {step === "setup" && setupData && (
            <form onSubmit={handleEnable} className="space-y-4">
              <p className="text-sm text-stone-600">
                Scannez ce QR code avec <strong>Google Authenticator</strong>, <strong>Authy</strong> ou toute app TOTP.
              </p>

              <div className="flex justify-center p-3 bg-white border border-stone-200 rounded-xl">
                <QRCodeSVG value={setupData.uri} size={180} />
              </div>

              <details className="text-xs text-stone-500">
                <summary className="cursor-pointer hover:text-stone-700">Saisie manuelle</summary>
                <p className="mt-1 font-mono bg-stone-50 rounded p-2 break-all select-all">{setupData.secret}</p>
              </details>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1 uppercase tracking-wide">
                  Confirmez avec le code affiché
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  className="w-full border border-stone-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-wine-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-wine-600 text-white rounded-xl py-3 font-semibold text-sm active:bg-wine-700 disabled:opacity-50"
              >
                {loading ? "Vérification…" : "Confirmer et activer"}
              </button>
              <button type="button" onClick={() => { setStep("idle"); setCode(""); }} className="w-full text-sm text-stone-400 hover:text-stone-600">
                Annuler
              </button>
            </form>
          )}

          {/* ── Disable: confirm with code ── */}
          {step === "disable" && (
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-sm text-stone-600">Saisissez votre code TOTP actuel pour désactiver le MFA.</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full border border-stone-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-wine-500"
              />
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full border border-red-200 text-red-600 rounded-xl py-3 font-semibold text-sm active:bg-red-50 disabled:opacity-50"
              >
                {loading ? "Vérification…" : "Désactiver"}
              </button>
              <button type="button" onClick={() => { setStep("idle"); setCode(""); }} className="w-full text-sm text-stone-400 hover:text-stone-600">
                Annuler
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
