export default function StampBadge({ status, size = "md" }) {
  const isLost = status === "Lost";
  return (
    <span
      className={`stamp stamp--${isLost ? "lost" : "found"} stamp--${size}`}
      aria-label={isLost ? "Lost item" : "Found item"}
    >
      {isLost ? "LOST" : "FOUND"}
    </span>
  );
}
