import { useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useItemsContext } from "../hooks/ItemsContext";
import { useAuthContext } from "../hooks/AuthContext"; // <-- ADD THIS
import { CATEGORIES, LOCATIONS } from "../data/constants";

const emptyForm = {
  title: "",
  category: CATEGORIES[0],
  location: LOCATIONS[0],
  date: new Date().toISOString().slice(0, 10),
  description: "",
  contact: "",
  photo: "",
};

export default function PostItem() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { addItem } = useItemsContext();

  // Authentication
  const { user, openLogin } = useAuthContext();

  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState("");

  if (type !== "lost" && type !== "found") {
    return <Navigate to="/" replace />;
  }

  // If user is NOT logged in
  if (!user) {
    return (
      <div
        className="page page--narrow"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "70vh",
        }}
      >
        <div
          style={{
            maxWidth: "450px",
            width: "100%",
            padding: "35px",
            borderRadius: "15px",
            background: "#fff",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ marginBottom: "15px" }}>
            🔒 Login Required
          </h2>

          <p style={{ color: "#555", marginBottom: "25px" }}>
            Please login to report a lost or found item.
          </p>

          <button
            className="btn btn--primary"
            onClick={openLogin}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const status = type === "lost" ? "Lost" : "Found";
  const isLost = status === "Lost";

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      setPhotoPreview(dataUrl);
      setForm((prev) => ({ ...prev, photo: dataUrl }));
    };

    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview("");
    setForm((prev) => ({ ...prev, photo: "" }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    const next = {};

    if (!form.title.trim())
      next.title = "Give the item a short, clear name.";

    if (!form.description.trim())
      next.description =
        "Add a few details so people can recognize it.";

    if (!form.date)
      next.date = "Pick the date this happened.";

    if (!form.contact.trim())
      next.contact =
        "Add an email or phone number so people can reach you.";

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const created = addItem({
      ...form,
      status,
    });

    navigate(`/item/${created.id}`);
  };

  return (
    <div className="page page--narrow">
      <div className={`post-header post-header--${type}`}>
        <p className="post-header__eyebrow">
          {isLost ? "Report a lost item" : "Report a found item"}
        </p>

        <h1>
          {isLost
            ? "Tell us what you lost."
            : "Tell us what you found."}
        </h1>

        <p className="post-header__sub">
          {isLost
            ? "The more detail you add, the faster someone can spot it and return it."
            : "Thank you for turning it in — details help the owner recognize it as theirs."}
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>

        <div className="form__group">
          <label>Item name</label>

          <input
            type="text"
            value={form.title}
            onChange={update("title")}
            placeholder={
              isLost
                ? "e.g. Black wallet with student ID"
                : "e.g. Set of car keys"
            }
          />

          {errors.title && (
            <p className="form__error">{errors.title}</p>
          )}
        </div>

        <div className="form__row">

          <div className="form__group">
            <label>Category</label>

            <select
              value={form.category}
              onChange={update("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label>
              {isLost
                ? "Last seen location"
                : "Found location"}
            </label>

            <select
              value={form.location}
              onChange={update("location")}
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label>
              {isLost ? "Date lost" : "Date found"}
            </label>

            <input
              type="date"
              value={form.date}
              onChange={update("date")}
            />

            {errors.date && (
              <p className="form__error">{errors.date}</p>
            )}
          </div>

        </div>

        <div className="form__group">
          <label>Description</label>

          <textarea
            rows="5"
            value={form.description}
            onChange={update("description")}
          />

          {errors.description && (
            <p className="form__error">
              {errors.description}
            </p>
          )}
        </div>

        <div className="form__group">
          <label>Photo (optional)</label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
          />

          {photoPreview && (
            <div className="form__photo-preview">
              <img
                src={photoPreview}
                alt="Preview"
              />

              <button
                type="button"
                onClick={removePhoto}
              >
                Remove photo
              </button>
            </div>
          )}
        </div>

        <div className="form__group">
          <label>Contact info</label>

          <input
            type="text"
            value={form.contact}
            onChange={update("contact")}
            placeholder="Email or phone number"
          />

          {errors.contact && (
            <p className="form__error">
              {errors.contact}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`btn btn--${type} btn--submit`}
        >
          {isLost
            ? "Pin this to the board"
            : "Post as found"}
        </button>

      </form>
    </div>
  );
}