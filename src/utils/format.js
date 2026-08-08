export function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(isoStr) {
  if (!isoStr) return "";
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(now - then, 0);
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function relevanceScore(item, query) {
  if (!query) return 0;

  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return 0;

  const fields = {
    title: String(item.title || "").toLowerCase(),
    category: String(item.category || "").toLowerCase(),
    location: String(item.location || "").toLowerCase(),
    description: String(item.description || "").toLowerCase(),
  };

  let score = 0;

  for (const token of tokens) {
    if (fields.title.includes(token)) score += 8;
    if (fields.category.includes(token)) score += 5;
    if (fields.location.includes(token)) score += 5;
    if (fields.description.includes(token)) score += 2;
  }

  // Small bonus for an exact phrase match.
  const phrase = query.trim().toLowerCase();
  if (fields.title.includes(phrase)) score += 8;
  if (fields.description.includes(phrase)) score += 3;

  return score;
}
