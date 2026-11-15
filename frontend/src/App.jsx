import { Navigate, Outlet, Route, Routes } from "react-router";
import Navbar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ProtectedRouteAdmin from "./components/ProtectedRouteAdmin.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import CreateCollectionPage from "./pages/CreateCollectionPage.jsx";
import CreateSetPage from "./pages/CreateSetPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PracticePage from "./pages/PracticePage.jsx";

function Layout() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-20">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="collections/new"
          element={
            <ProtectedRouteAdmin>
              <CreateCollectionPage />
            </ProtectedRouteAdmin>
          }
        />
        <Route
          path="collections/:id"
          element={
            <ProtectedRouteAdmin>
              <CollectionPage />
            </ProtectedRouteAdmin>
          }
        />
        <Route
          path="collections/:id/sets/new"
          element={
            <ProtectedRouteAdmin>
              <CreateSetPage />
            </ProtectedRouteAdmin>
          }
        />
        <Route path="practice/:id" element={<PracticePage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="landing" element={<LandingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
