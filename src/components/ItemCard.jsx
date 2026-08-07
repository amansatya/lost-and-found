import { Link } from "react-router-dom";
import StampBadge from "./StampBadge";
import Pushpin from "./Pushpin";
import { CATEGORY_ICONS } from "../data/constants";
import { formatDate, timeAgo } from "../utils/format";

export default function ItemCard({ item }) {
  const pinColor = item.status === "Lost" ? "#8a3324" : "#2f5a3f";

  return (
    <Link
      to={`/item/${item.id}`}
      className="card"
      style={{ "--tilt": `${item.rotation || 0}deg` }}
    >
      <Pushpin color={pinColor} />
      <div className="card__top">
        <StampBadge status={item.status} />
        <span className="card__category">
          <span aria-hidden="true">{CATEGORY_ICONS[item.category] || "●"}</span>{" "}
          {item.category}
        </span>
      </div>

      {item.photo ? (
        <div className="card__photo">
          <img src={item.photo} alt={item.title} loading="lazy" />
        </div>
      ) : null}

      <h3 className="card__title">{item.title}</h3>

      <p className="card__desc">{item.description}</p>

      <div className="card__meta">
        <span className="card__meta-row">
          <span className="card__meta-label">Where</span> {item.location}
        </span>
        <span className="card__meta-row">
          <span className="card__meta-label">When</span> {formatDate(item.date)}
        </span>
      </div>

      <div className="card__footer">
        <span>Posted {timeAgo(item.postedAt)}</span>
      </div>
    </Link>
  );
}
