import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { errMsg } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // above the component (or inside it)
  const closeDropdown = () => document.activeElement?.blur();

  // inside Navbar, before the return:
  const navLinks = [
    ...(user?.role === "admin"
      ? [
          {
            to: "/collections/new",
            icon: "add_circle",
            label: "New collection",
          },
        ]
      : []),
    { to: "/landing", icon: "info", label: "About" },
    { to: "/practice", icon: "keyboard", label: "Practice Typing" },
    { to: "/", icon: "trending_up", label: "Progress" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-base-100/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(58,48,42,0.05)]">
      <div className="h-16 max-w-6xl mx-auto px-6 lg:px-10 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-headline font-semibold text-2xl group-hover:text-primary transition-colors">
            TippSatz
          </span>
          <span className="font-headline italic text-primary text-xl"></span>
          <span className="hidden md:inline badge badge-ghost badge-sm uppercase tracking-wider">
            Custom typing sets
          </span>
        </Link>

        <div className="flex items-center gap-2 ">
          {user && (
            <>
              {/* Desktop: inline links */}
              <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} className="btn btn-ghost btn-sm">
                    <Icon name={l.icon} className="text-primary" />
                    <span>{l.label}</span>
                  </Link>
                ))}
              </div>

              {/* Mobile: hamburger dropdown */}
              <div className="dropdown dropdown-end sm:hidden">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-sm btn-square"
                  aria-label="Open menu"
                >
                  <Icon name="menu" className="text-primary" />
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-white rounded-box shadow-lg w-56 p-2 mt-3 z-50"
                >
                  {navLinks.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} onClick={closeDropdown}>
                        <Icon name={l.icon} className="text-primary" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {user ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="avatar cursor-pointer">
                <div className="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Icon name="person" />
                  )}
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-white rounded-box shadow-lg w-60 p-2 mt-3 z-50"
              >
                <li className="px-3 py-2 pointer-events-none">
                  <span className="font-semibold leading-tight">
                    {user?.name}
                  </span>
                  <span className="text-xs text-base-content/60 break-all">
                    {user?.email}
                  </span>
                </li>
                <li>
                  <button onClick={logout}>
                    <Icon name="logout" /> Sign out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-start">
              <GoogleLogin
                shape="pill"
                size="large"
                onSuccess={async (res) => {
                  try {
                    await loginWithGoogle(res.credential);
                    navigate("/", { replace: true });
                  } catch (e) {
                    setError(errMsg(e));
                  }
                }}
                onError={() => setError("Google sign-in failed")}
              />
              {error && (
                <div
                  role="alert"
                  className="alert alert-error alert-soft text-sm"
                >
                  <Icon name="error" /> {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
