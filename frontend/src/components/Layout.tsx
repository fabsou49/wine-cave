import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../api";
import MfaSetup from "./MfaSetup";

const navItems = [
  { to: "/", label: "Cave", icon: "🍷" },
  { to: "/inventory", label: "Inventaire", icon: "📦" },
  { to: "/history", label: "Historique", icon: "📖" },
];

export default function Layout() {
  const navigate = useNavigate();
  const [showMfa, setShowMfa] = useState(false);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen min-h-dvh bg-stone-100 flex flex-col">
      <header className="bg-wine-700 text-white shadow-md shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="text-lg font-bold tracking-wide">🍷 Cave à Vin</span>
          <nav className="hidden sm:flex gap-1 flex-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-white/20 text-white" : "text-wine-100 hover:bg-wine-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden sm:flex items-center gap-3">
            <button
              onClick={() => setShowMfa(true)}
              className="text-wine-200 hover:text-white text-sm"
              title="Double authentification"
            >
              🔐
            </button>
            <button onClick={handleLogout} className="text-wine-200 hover:text-white text-sm">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 pb-24 sm:pb-6 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex shadow-lg z-50 pb-safe">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-wine-700" : "text-stone-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-xl mb-0.5 transition-transform ${isActive ? "scale-110" : ""}`}>{icon}</span>
                <span className={isActive ? "text-wine-700 font-semibold" : ""}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setShowMfa(true)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] font-medium text-stone-400 active:text-stone-600"
        >
          <span className="text-xl mb-0.5">🔐</span>
          <span>Sécurité</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-[11px] font-medium text-stone-400 active:text-stone-600"
        >
          <span className="text-xl mb-0.5">🚪</span>
          <span>Quitter</span>
        </button>
      </nav>

      {showMfa && <MfaSetup onClose={() => setShowMfa(false)} />}
    </div>
  );
}
