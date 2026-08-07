import { Link, useParams } from "react-router-dom";
import { useItemsContext } from "../hooks/ItemsContext";
import StampBadge from "../components/StampBadge";
import Pushpin from "../components/Pushpin";
import { CATEGORY_ICONS } from "../data/constants";
import { formatDate, timeAgo } from "../utils/format";

export default function ItemDetails() {
  const { id } = useParams();
  const { getItem } = useItemsContext();
  const item = getItem(id);

  if (!item) {
    return (
      <div className="page page--narrow">
        <div className="empty-state">
          <p className="empty-state__title">This notice has been taken down.</p>
          <p className="empty-state__body">
            The listing may have been resolved or removed.
          </p>
          <Link to="/" className="btn btn--found">
            Back to the board
          </Link>
        </div>
      </div>
    );
  }

  const isLost = item.status === "Lost";
  const pinColor = isLost ? "#8a3324" : "#2f5a3f";
  const mailHref = item.contact.includes("@")
    ? `mailto:${item.contact}?subject=${encodeURIComponent(
        `Regarding ${item.status.toLowerCase()} item: ${item.title}`
      )}`
    : null;

  return (
    <div className="page page--narrow">
      <Link to="/" className="back-link">
        ← Back to the board
      </Link>

      <article
        className="detail-card"
        style={{ "--tilt": `${item.rotation || 0}deg` }}
      >
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
          <h2>Description</h2>
          <p>{item.description}</p>
        </div>

        <div className="detail-card__contact">
          <h2>{isLost ? "Seen it? Reach out." : "Is it yours? Reach out."}</h2>
          <p className="detail-card__contact-value">{item.contact}</p>
          {mailHref && (
            <a href={mailHref} className={`btn btn--${item.status.toLowerCase()}`}>
              Contact about this item
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
