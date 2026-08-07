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

// Simple relevance score for keyword search across a few fields,
// weighted so title matches count more than description matches.
export function relevanceScore(item, query) {
  if (!query) return 0;
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  let score = 0;
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  const cat = item.category.toLowerCase();
  const loc = item.location.toLowerCase();

  if (title.includes(q)) score += 5;
  if (cat.includes(q)) score += 3;
  if (loc.includes(q)) score += 3;
  if (desc.includes(q)) score += 1;

  return score;
}
