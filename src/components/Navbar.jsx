import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";

export default function Navbar() {
  const { user, openLogin, logout } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__pin" aria-hidden="true" />
          <span className="navbar__brand-text">
            The Board
            <span className="navbar__brand-sub">Campus Lost &amp; Found</span>
          </span>
        </Link>

        <nav className="navbar__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "navbar__link" + (isActive ? " navbar__link--active" : "")
            }
          >
            Browse
          </NavLink>
          <NavLink
            to="/post/lost"
            className={({ isActive }) =>
              "navbar__link navbar__link--lost" +
              (isActive ? " navbar__link--active" : "")
            }
          >
            Report Lost
          </NavLink>
          <NavLink
            to="/post/found"
            className={({ isActive }) =>
              "navbar__link navbar__link--found" +
              (isActive ? " navbar__link--active" : "")
            }
          >
            Report Found
          </NavLink>
        </nav>

        <div className="navbar__auth" ref={menuRef}>
          {user ? (
            <>
              <button
                type="button"
                className="navbar__user"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <span className="navbar__avatar">{user.initials}</span>
                <span className="navbar__username">{user.name}</span>
              </button>
              {menuOpen && (
                <div className="navbar__menu" role="menu">
                  <div className="navbar__menu-email">{user.email}</div>
                  <button
                    type="button"
                    className="navbar__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className="btn btn--navy btn--login"
              onClick={openLogin}
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

