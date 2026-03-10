import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Cave from "./pages/Cave";
import Inventory from "./pages/Inventory";
import History from "./pages/History";
import Login from "./pages/Login";
import { getToken } from "./api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30 } },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Cave />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" containerStyle={{ top: 70 }} />
    </QueryClientProvider>
  );
}
