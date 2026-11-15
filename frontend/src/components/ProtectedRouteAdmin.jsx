import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

export default function ProtectedRouteAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user.role === "admin" ? children : <Navigate to="/landing" replace />;
}
