import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthContext } from "../hooks/AuthContext";

export default function Navbar() {
  const { user, loading, openLogin, logout } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    setMenuOpen(false);
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" onClick={closeMobile}>
          <span className="navbar__pin" aria-hidden="true" />
          <span className="navbar__brand-text">
            The Board
            <span className="navbar__brand-sub">KIIT Lost &amp; Found</span>
          </span>
        </Link>

        <button
          type="button"
          className={`navbar__toggle ${mobileOpen ? "navbar__toggle--open" : ""}`}
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__content ${mobileOpen ? "navbar__content--open" : ""}`}>
          <nav className="navbar__links" aria-label="Primary navigation">
            <NavLink
              to="/"
              end
              onClick={closeMobile}
              className={({ isActive }) =>
                "navbar__link" + (isActive ? " navbar__link--active" : "")
              }
            >
              Browse
            </NavLink>

            <NavLink
              to="/post/lost"
              onClick={closeMobile}
              className={({ isActive }) =>
                "navbar__link navbar__link--lost" +
                (isActive ? " navbar__link--active" : "")
              }
            >
              Report Lost
            </NavLink>

            <NavLink
              to="/post/found"
              onClick={closeMobile}
              className={({ isActive }) =>
                "navbar__link navbar__link--found" +
                (isActive ? " navbar__link--active" : "")
              }
            >
              Report Found
            </NavLink>
          </nav>

          <div className="navbar__auth" ref={menuRef}>
            {loading ? (
              <div className="navbar__session-loading" aria-label="Checking session">
                <span className="navbar__avatar navbar__avatar--loading" />
              </div>
            ) : user ? (
              <>
                <button
                  type="button"
                  className="navbar__user"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <span className="navbar__avatar">{user.initials}</span>
                  <span className="navbar__user-copy">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </span>
                  <span className={`navbar__chevron ${menuOpen ? "navbar__chevron--up" : ""}`}>
                    ▾
                  </span>
                </button>

                {menuOpen && (
                  <div className="navbar__menu" role="menu">
                    <div className="navbar__profile">
                      <span className="navbar__profile-avatar">{user.initials}</span>
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>

                    <div className="navbar__menu-divider" />

                    <button
                      type="button"
                      className="navbar__menu-item navbar__menu-item--logout"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        closeMobile();
                        logout();
                      }}
                    >
                      <span aria-hidden="true">↪</span>
                      Log out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn btn--navy btn--login"
                onClick={() => {
                  closeMobile();
                  openLogin();
                }}
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
