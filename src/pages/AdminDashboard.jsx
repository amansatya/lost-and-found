import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../services/adminApi";
import { CATEGORIES, LOCATIONS } from "../data/constants";

const emptyUser = { name: "", rollNo: "", email: "", verified: true, password: "" };
const emptyItem = {
  status: "Lost",
  title: "",
  category: CATEGORIES[0],
  location: LOCATIONS[0],
  date: new Date().toISOString().slice(0, 10),
  description: "",
  contact: "",
  active: true,
};

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    adminApi.me()
      .then((data) => setAdmin(data.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!admin) return;
    loadData();
  }, [admin]);

  async function loadData() {
    setLoadingData(true);
    setPageError("");
    try {
      const [userData, itemData] = await Promise.all([adminApi.users(), adminApi.items()]);
      setUsers(userData.users || []);
      setItems(itemData.items || []);
    } catch (error) {
      if (error?.status === 401) setAdmin(null);
      setPageError(error?.message || "Couldn't load admin data.");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const data = await adminApi.login(loginEmail.trim().toLowerCase(), loginPassword);
      setAdmin({ email: data.email });
      setLoginPassword("");
    } catch (error) {
      setLoginError(error?.message || "Invalid admin credentials.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await adminApi.logout().catch(() => {});
    setAdmin(null);
    setUsers([]);
    setItems([]);
  }

  async function saveUser(event) {
    event.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setActionError("");
    try {
      const data = await adminApi.updateUser(editingUser.id, editingUser);
      setUsers((current) => current.map((user) => user.id === data.user.id ? data.user : user));
      setEditingUser(null);
    } catch (error) {
      setActionError(error?.message || "Couldn't update user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name || user.email}? Their notices will remain but become unowned.`)) return;
    setActionError("");
    try {
      await adminApi.deleteUser(user.id);
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      setItems((current) => current.map((item) => item.ownerId === user.id ? { ...item, ownerId: null, owner: null } : item));
    } catch (error) {
      setActionError(error?.message || "Couldn't delete user.");
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    setActionError("");

    const payload = new FormData();
    payload.append("status", editingItem.status);
    payload.append("title", editingItem.title);
    payload.append("category", editingItem.category);
    payload.append("location", editingItem.location);
    payload.append("date", editingItem.date);
    payload.append("description", editingItem.description);
    payload.append("contact", editingItem.contact);
    payload.append("ownerId", editingItem.ownerId || "");
    payload.append("active", String(Boolean(editingItem.active)));
    if (editingItem.newPhoto) payload.append("photo", editingItem.newPhoto);

    try {
      const data = await adminApi.updateItem(editingItem.id, payload);
      setItems((current) => current.map((item) => item.id === data.item.id ? data.item : item));
      setEditingItem(null);
    } catch (error) {
      setActionError(error?.message || "Couldn't update item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Permanently delete “${item.title}”? This also removes its Cloudinary image.`)) return;
    setActionError("");
    try {
      await adminApi.deleteItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      setActionError(error?.message || "Couldn't delete item.");
    }
  }

  const stats = useMemo(() => ({
    users: users.length,
    items: items.length,
    active: items.filter((item) => item.active).length,
    closed: items.filter((item) => !item.active).length,
  }), [users, items]);

  if (checking) {
    return <div className="page page--narrow page-state"><div className="loading-state"><span className="loading-state__dot" /><p>Checking admin access…</p></div></div>;
  }

  if (!admin) {
    return (
      <div className="page page--narrow admin-page">
        <div className="admin-login-card">
          <p className="post-header__eyebrow">Restricted access</p>
          <h1>Admin dashboard</h1>
          <p>Use the configured administrator email and password. Student accounts cannot access this area.</p>
          <form className="modal__form" onSubmit={handleLogin}>
            <label className="field">
              <span className="field__label">Admin email</span>
              <input className="field__input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label className="field">
              <span className="field__label">Admin password</span>
              <input className="field__input" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            {loginError && <p className="modal__error" role="alert">{loginError}</p>}
            <button className="btn btn--navy btn--submit" disabled={loginLoading}>
              {loginLoading ? "Signing in…" : "Sign in as admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page admin-page admin-page--wide">
      <div className="admin-header">
        <div>
          <p className="post-header__eyebrow">Control center</p>
          <h1>Admin dashboard</h1>
          <p>Manage registered students and every lost/found notice.</p>
        </div>
        <button className="btn btn--secondary" onClick={handleLogout}>Log out</button>
      </div>

      <div className="admin-stats">
        <div><strong>{stats.users}</strong><span>Users</span></div>
        <div><strong>{stats.items}</strong><span>Total notices</span></div>
        <div><strong>{stats.active}</strong><span>Active</span></div>
        <div><strong>{stats.closed}</strong><span>Closed</span></div>
      </div>

      {pageError && <div className="form__alert" role="alert">{pageError}</div>}
      {actionError && <div className="form__alert" role="alert"><span>{actionError}</span></div>}

      <div className="admin-tabs">
        <button className={tab === "users" ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setTab("users")}>Users ({users.length})</button>
        <button className={tab === "items" ? "admin-tab admin-tab--active" : "admin-tab"} onClick={() => setTab("items")}>Items ({items.length})</button>
        <button className="btn btn--secondary admin-refresh" onClick={loadData} disabled={loadingData}>{loadingData ? "Refreshing…" : "Refresh"}</button>
      </div>

      {tab === "users" ? (
        <section className="admin-table-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Roll no.</th><th>Email</th><th>Verified</th><th>Provider</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || "—"}</td>
                    <td className="admin-mono">{user.rollNo || "—"}</td>
                    <td>{user.email}</td>
                    <td>{user.verified ? "Yes" : "No"}</td>
                    <td>{user.provider}</td>
                    <td className="admin-actions">
                      <button onClick={() => setEditingUser({ ...user, password: "" })}>Edit</button>
                      <button className="admin-danger" onClick={() => deleteUser(user)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="admin-table-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Photo</th><th>Item</th><th>Status</th><th>Owner</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.photo ? <img className="admin-thumb" src={item.photo} alt="" /> : "—"}</td>
                    <td><strong>{item.title}</strong><small>{item.category} · {item.location}</small></td>
                    <td>{item.status}</td>
                    <td>{item.owner ? <><strong>{item.owner.name}</strong><small>{item.owner.rollNo || item.owner.email}</small></> : "Unowned"}</td>
                    <td>{item.active ? "Active" : "Closed"}</td>
                    <td className="admin-actions"><button onClick={() => setEditingItem({ ...item, newPhoto: null })}>Edit</button><button className="admin-danger" onClick={() => deleteItem(item)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editingUser && (
        <div className="admin-modal-overlay">
          <form className="admin-edit-card" onSubmit={saveUser}>
            <div className="admin-edit-head"><div><p className="post-header__eyebrow">User control</p><h2>Edit user</h2></div><button type="button" onClick={() => setEditingUser(null)}>×</button></div>
            <label className="field"><span className="field__label">Name</span><input className="field__input" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} required /></label>
            <label className="field"><span className="field__label">Roll number</span><input className="field__input" value={editingUser.rollNo} onChange={(e) => setEditingUser({ ...editingUser, rollNo: e.target.value.replace(/\D/g, "") })} required /></label>
            <label className="field"><span className="field__label">Email</span><input className="field__input" type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required /></label>
            <label className="field"><span className="field__label">New password (optional)</span><input className="field__input" type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={editingUser.verified} onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })} /> Verified account</label>
            <div className="admin-edit-actions"><button type="button" className="btn btn--secondary" onClick={() => setEditingUser(null)}>Cancel</button><button className="btn btn--navy" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
          </form>
        </div>
      )}

      {editingItem && (
        <div className="admin-modal-overlay">
          <form className="admin-edit-card admin-edit-card--wide" onSubmit={saveItem}>
            <div className="admin-edit-head"><div><p className="post-header__eyebrow">Notice control</p><h2>Edit item</h2></div><button type="button" onClick={() => setEditingItem(null)}>×</button></div>
            <div className="form__row">
              <label className="field"><span className="field__label">Status</span><select className="field__input" value={editingItem.status} onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}><option>Lost</option><option>Found</option></select></label>
              <label className="field"><span className="field__label">Category</span><select className="field__input" value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span className="field__label">Location</span><select className="field__input" value={editingItem.location} onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></label>
            </div>
            <label className="field"><span className="field__label">Title</span><input className="field__input" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} required /></label>
            <label className="field"><span className="field__label">Date</span><input className="field__input" type="date" value={editingItem.date} onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })} required /></label>
            <label className="field"><span className="field__label">Description</span><textarea className="field__input" rows="4" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} required /></label>
            <label className="field"><span className="field__label">Contact</span><input className="field__input" value={editingItem.contact} onChange={(e) => setEditingItem({ ...editingItem, contact: e.target.value })} required /></label>
            <label className="field"><span className="field__label">Owner</span><select className="field__input" value={editingItem.ownerId || ""} onChange={(e) => setEditingItem({ ...editingItem, ownerId: e.target.value })}><option value="">No owner</option>{users.map((user) => <option key={user.id} value={user.id}>{user.rollNo || user.email} — {user.name || "Unnamed"}</option>)}</select></label>
            <label className="field"><span className="field__label">Replace photo (optional)</span><input className="field__input" type="file" accept="image/*" onChange={(e) => setEditingItem({ ...editingItem, newPhoto: e.target.files?.[0] || null })} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={editingItem.active} onChange={(e) => setEditingItem({ ...editingItem, active: e.target.checked })} /> Active on the public board</label>
            <div className="admin-edit-actions"><button type="button" className="btn btn--secondary" onClick={() => setEditingItem(null)}>Cancel</button><button className="btn btn--navy" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
