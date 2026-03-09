import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Cave", icon: "🍷" },
  { to: "/inventory", label: "Inventaire", icon: "📦" },
  { to: "/settings", label: "Paramètres", icon: "⚙️" },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Header desktop */}
      <header className="bg-wine-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="text-xl font-bold tracking-wide">🍷 Cave à Vin</span>
          {/* Nav desktop uniquement */}
          <nav className="hidden sm:flex gap-2">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-wine-700"
                      : "text-wine-100 hover:bg-wine-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Contenu principal — padding bottom sur mobile pour la nav */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 pb-24 sm:pb-6">
        <Outlet />
      </main>

      {/* Navigation bas — mobile uniquement */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex shadow-lg z-50">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors ${
                isActive ? "text-wine-700" : "text-stone-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xl mb-0.5">{icon}</span>
                <span className={isActive ? "text-wine-700 font-semibold" : ""}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
