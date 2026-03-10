import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setToken, verifyMfa } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA step
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const mfaInputRef = useRef<HTMLInputElement>(null);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.mfa_required) {
        setTempToken(res.temp_token);
        setTimeout(() => mfaInputRef.current?.focus(), 100);
      } else {
        setToken(res.access_token);
        navigate("/", { replace: true });
      }
    } catch {
      setError("Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setError("");
    setLoading(true);
    try {
      const { access_token } = await verifyMfa(tempToken, mfaCode);
      setToken(access_token);
      navigate("/", { replace: true });
    } catch {
      setError("Code incorrect");
      setMfaCode("");
      mfaInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500";

  return (
    <div className="min-h-screen min-h-dvh bg-stone-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🍷</span>
          <h1 className="text-2xl font-bold text-wine-700 mt-3">Cave à Vin</h1>
        </div>

        {/* ── Step 1 : credentials ── */}
        {!tempToken && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={inputCls}
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-wine-600 text-white rounded-lg py-2.5 font-semibold hover:bg-wine-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        )}

        {/* ── Step 2 : TOTP code ── */}
        {tempToken && (
          <form onSubmit={handleMfa} className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-2xl">🔐</p>
              <p className="text-sm font-medium text-stone-700">Code d'authentification</p>
              <p className="text-xs text-stone-400">Ouvrez votre application d'authentification et saisissez le code à 6 chiffres.</p>
            </div>
            <input
              ref={mfaInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              className="w-full border border-stone-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-wine-500"
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="w-full bg-wine-600 text-white rounded-lg py-2.5 font-semibold hover:bg-wine-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Vérification…" : "Vérifier"}
            </button>
            <button
              type="button"
              onClick={() => { setTempToken(null); setMfaCode(""); setError(""); }}
              className="w-full text-sm text-stone-400 hover:text-stone-600"
            >
              ← Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
