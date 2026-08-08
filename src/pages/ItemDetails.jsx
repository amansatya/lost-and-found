import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useItemsContext } from "../hooks/ItemsContext";
import { useAuthContext } from "../hooks/AuthContext";
import StampBadge from "../components/StampBadge";
import Pushpin from "../components/Pushpin";
import { CATEGORY_ICONS } from "../data/constants";
import { formatDate, timeAgo } from "../utils/format";

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getItem, closeItem } = useItemsContext();
  const { user } = useAuthContext();

  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  const item = getItem(id);

  if (!item) {
    return (
      <div className="page page--narrow page-state">
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">✓</span>
          <p className="empty-state__eyebrow">Notice unavailable</p>
          <p className="empty-state__title">This notice is no longer active.</p>
          <p className="empty-state__body">
            It may have been closed by its owner or automatically archived after
            the board reached its 30-active-listing limit.
          </p>
          <Link to="/" className="btn btn--navy">
            Back to the board
          </Link>
        </div>
      </div>
    );
  }

  const isLost = item.status === "Lost";
  const isOwner = Boolean(user && item.ownerId === user.id);
  const pinColor = isLost ? "#8a3324" : "#2f5a3f";

  const mailHref = item.contact?.includes("@")
    ? `mailto:${item.contact}?subject=${encodeURIComponent(
        `Regarding ${item.status.toLowerCase()} item: ${item.title}`
      )}`
    : null;

  async function handleClose() {
    if (!isOwner || closing) return;

    setClosing(true);
    setCloseError("");

    try {
      await closeItem(item.id);
      navigate("/", { replace: true });
    } catch (error) {
      setCloseError(
          error?.message ||
          "We couldn't close this notice. Please try again."
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="page page--narrow">
      <Link to="/" className="back-link">
        ← Back to the board
      </Link>

      <article className="detail-card">
        <Pushpin color={pinColor} />

        <div className="detail-card__top">
          <StampBadge status={item.status} size="lg" />
          <span className="card__category">
            <span aria-hidden="true">
              {CATEGORY_ICONS[item.category] || "●"}
            </span>{" "}
            {item.category}
          </span>
        </div>

        <h1 className="detail-card__title">{item.title}</h1>

        {item.photo && (
          <div className="detail-card__photo">
            <img src={item.photo} alt={item.title} />
          </div>
        )}

        <dl className="detail-card__facts">
          <div>
            <dt>Location</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>{isLost ? "Date lost" : "Date found"}</dt>
            <dd>{formatDate(item.date)}</dd>
          </div>
          <div>
            <dt>Posted</dt>
            <dd>{timeAgo(item.postedAt)}</dd>
          </div>
        </dl>

        <div className="detail-card__section">
          <h2>About this item</h2>
          <p>{item.description}</p>
        </div>

        <div className="detail-card__contact">
          <h2>{isLost ? "Seen it? Reach out." : "Is it yours? Reach out."}</h2>
          <p className="detail-card__contact-value">{item.contact}</p>

          {mailHref && (
            <a
              href={mailHref}
              className={`btn btn--${item.status.toLowerCase()}`}
            >
              Contact about this item
            </a>
          )}
        </div>

        {isOwner && (
          <div className="detail-card__owner">
            <div>
              <p className="detail-card__owner-label">Your notice</p>
              <p className="detail-card__owner-copy">
                Close it when the item has been returned or claimed.
              </p>
            </div>

            <button
                type="button"
                className="btn btn--close"
                onClick={() => setShowCloseModal(true)}
                disabled={closing}
            >
              {closing ? "Closing…" : "Close this notice"}
            </button>
          </div>
        )}

        {closeError && (
          <p className="modal__error detail-card__error" role="alert">
            {closeError}
          </p>
        )}
      </article>
      {showCloseModal && (
          <div
              className="confirm-modal-overlay"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !closing) {
                  setShowCloseModal(false);
                }
              }}
          >
            <div
                className="confirm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="close-notice-title"
                aria-describedby="close-notice-description"
            >
              <button
                  type="button"
                  className="confirm-modal__close"
                  onClick={() => setShowCloseModal(false)}
                  disabled={closing}
                  aria-label="Close confirmation"
              >
                ×
              </button>

              <div className="confirm-modal__icon" aria-hidden="true">
                ✓
              </div>

              <p className="confirm-modal__eyebrow">
                Close notice
              </p>

              <h2
                  id="close-notice-title"
                  className="confirm-modal__title"
              >
                Is this item no longer needed?
              </h2>

              <p
                  id="close-notice-description"
                  className="confirm-modal__body"
              >
                Closing this notice removes it from the active board.
                The record will remain safely stored in the database.
              </p>

              <div className="confirm-modal__item">
                <strong>{item.title}</strong>
                <span>
          {item.status} · {item.location}
        </span>
              </div>

              <div className="confirm-modal__actions">
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setShowCloseModal(false)}
                    disabled={closing}
                >
                  Keep notice
                </button>

                <button
                    type="button"
                    className="btn btn--close"
                    onClick={handleClose}
                    disabled={closing}
                >
                  {closing ? "Closing…" : "Yes, close notice"}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
