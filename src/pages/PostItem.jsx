import { useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useItemsContext } from "../hooks/ItemsContext";
import { useAuthContext } from "../hooks/AuthContext";
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
  const { user, loading, openLogin } = useAuthContext();

  const today = new Date().toISOString().slice(0, 10);

  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (type !== "lost" && type !== "found") {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="page page--narrow page-state">
        <div className="loading-state">
          <span className="loading-state__dot" aria-hidden="true" />
          <p>Checking your account…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page page--narrow page-state">
        <div className="empty-state empty-state--auth">
          <span className="empty-state__icon" aria-hidden="true">✦</span>
          <p className="empty-state__eyebrow">Member access</p>
          <h2 className="empty-state__title">Sign in to post a notice</h2>
          <p className="empty-state__body">
            Your KIIT account keeps listings tied to the person who posted them,
            so you can close your own notice when the item is returned.
          </p>
          <button className="btn btn--navy" onClick={openLogin}>
            Log in to continue
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

    if (file.size > 2 * 1024 * 1024) {
      setSubmitError("Please choose an image smaller than 2 MB.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmitError("Please choose an image file.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      setPhotoPreview(dataUrl);
      setForm((prev) => ({ ...prev, photo: dataUrl }));
      setSubmitError("");
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

    if (!form.title.trim()) {
      next.title = "Give the item a short, clear name.";
    }

    if (!form.description.trim()) {
      next.description = "Add a few details so people can recognize it.";
    } else if (form.description.trim().length < 10) {
      next.description = "Add a little more detail — at least 10 characters.";
    }

    if (!form.date) {
      next.date = "Pick the date this happened.";
    } else if (form.date > today) {
      next.date = "The date cannot be in the future.";
    }

    if (!form.contact.trim()) {
      next.contact = "Add an email or phone number so people can reach you.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const created = await addItem({
        ...form,
        status,
      });

      navigate(`/item/${created.id}`);
    } catch (error) {
      setSubmitError(
        error?.message ||
          "We couldn't publish your listing. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--narrow">
      <div className={`post-header post-header--${type}`}>
        <p className="post-header__eyebrow">
          {isLost ? "Report something missing" : "Report something found"}
        </p>

        <h1>
          {isLost ? "Help us get it back to you." : "Help us get it home."}
        </h1>

        <p className="post-header__sub">
          {isLost
            ? "Add the details someone on campus would need to recognize your item."
            : "A clear description helps the owner confirm the item before arranging a handoff."}
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="form__alert" role="alert">
            <strong>We couldn't publish this notice.</strong>
            <span>{submitError}</span>
          </div>
        )}

        <div className="form__group">
          <label htmlFor="item-title">Item name</label>
          <input
            id="item-title"
            type="text"
            value={form.title}
            onChange={update("title")}
            placeholder={
              isLost
                ? "e.g. Black wallet with student ID"
                : "e.g. Set of car keys"
            }
            maxLength={120}
          />
          {errors.title && <p className="form__error">{errors.title}</p>}
        </div>

        <div className="form__row">
          <div className="form__group">
            <label htmlFor="item-category">Category</label>
            <select
              id="item-category"
              value={form.category}
              onChange={update("category")}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label htmlFor="item-location">
              {isLost ? "Last seen location" : "Found location"}
            </label>
            <select
              id="item-location"
              value={form.location}
              onChange={update("location")}
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form__group">
            <label htmlFor="item-date">
              {isLost ? "Date lost" : "Date found"}
            </label>
            <input
                id="item-date"
                type="date"
                value={form.date}
                max={today}
                onChange={update("date")}
            />
            {errors.date && <p className="form__error">{errors.date}</p>}
          </div>
        </div>

        <div className="form__group">
          <label htmlFor="item-description">Description</label>
          <textarea
            id="item-description"
            rows="5"
            value={form.description}
            onChange={update("description")}
            placeholder={
              isLost
                ? "Colour, marks, stickers, contents, where you last saw it…"
                : "Colour, identifying marks, where you found it, and where it is being kept…"
            }
            maxLength={2000}
          />
          <span className="field__hint field__hint--right">
            {form.description.length}/2000
          </span>
          {errors.description && (
            <p className="form__error">{errors.description}</p>
          )}
        </div>

        <div className="form__group">
          <label htmlFor="item-photo">Photo <span>(optional)</span></label>
          <input
            ref={fileInputRef}
            id="item-photo"
            type="file"
            accept="image/*"
            onChange={handlePhoto}
          />
          <span className="field__hint">JPG, PNG or WEBP · up to 2 MB</span>

          {photoPreview && (
            <div className="form__photo-preview">
              <img src={photoPreview} alt="Selected item preview" />
              <button type="button" onClick={removePhoto}>
                Remove photo
              </button>
            </div>
          )}
        </div>

        <div className="form__group">
          <label htmlFor="item-contact">Contact information</label>
          <input
            id="item-contact"
            type="text"
            value={form.contact}
            onChange={update("contact")}
            placeholder="KIIT email or phone number"
            maxLength={160}
          />
          <span className="field__hint">
            Use a contact method you are comfortable sharing with other KIIT users.
          </span>
          {errors.contact && <p className="form__error">{errors.contact}</p>}
        </div>

        <div className="form__submit-note">
          <span className="form__submit-dot" aria-hidden="true" />
          <p>
            You’re posting as <strong>{user.name}</strong>. You can close this
            notice later when the item is returned or claimed.
          </p>
        </div>

        <button
          type="submit"
          className={`btn btn--${type} btn--submit`}
          disabled={submitting}
        >
          {submitting
            ? "Publishing notice…"
            : isLost
            ? "Post lost item"
            : "Post found item"}
        </button>
      </form>
    </div>
  );
}
