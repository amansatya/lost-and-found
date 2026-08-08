import { CATEGORIES, LOCATIONS } from "../data/constants";

export default function FilterBar({ filters, onChange, resultCount }) {
  const update = (key) => (e) =>
    onChange({ ...filters, [key]: e.target.value });

  const clearAll = () =>
    onChange({
      query: "",
      status: "All",
      category: "All",
      location: "All",
      sort: "recent",
    });

  const hasActiveFilters =
    filters.query.trim() ||
    filters.status !== "All" ||
    filters.category !== "All" ||
    filters.location !== "All" ||
    filters.sort !== "recent";

  return (
    <div className="filterbar">
      <div className="filterbar__search">
        <label htmlFor="board-search" className="sr-only">
          Search active notices
        </label>
        <input
          id="board-search"
          type="search"
          placeholder="Search items, colours, places, or details…"
          value={filters.query}
          onChange={update("query")}
          aria-label="Search active notices"
        />
      </div>

      <div className="filterbar__row">
        <label className="filterbar__field">
          <span>Status</span>
          <select value={filters.status} onChange={update("status")}>
            <option value="All">All notices</option>
            <option value="Lost">Lost items</option>
            <option value="Found">Found items</option>
          </select>
        </label>

        <label className="filterbar__field">
          <span>Category</span>
          <select value={filters.category} onChange={update("category")}>
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="filterbar__field">
          <span>Location</span>
          <select value={filters.location} onChange={update("location")}>
            <option value="All">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className="filterbar__field">
          <span>Sort by</span>
          <select value={filters.sort} onChange={update("sort")}>
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="filterbar__status">
        <span>
          <strong>{resultCount}</strong>{" "}
          {resultCount === 1 ? "active notice" : "active notices"}
        </span>

        {hasActiveFilters && (
          <button type="button" className="filterbar__clear" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
