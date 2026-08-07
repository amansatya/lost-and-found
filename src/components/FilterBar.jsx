import { CATEGORIES, LOCATIONS } from "../data/constants";

export default function FilterBar({ filters, onChange, resultCount }) {
  const update = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const clearAll = () =>
    onChange({
      query: "",
      status: "All",
      category: "All",
      location: "All",
      sort: "recent",
    });

  const hasActiveFilters =
    filters.query ||
    filters.status !== "All" ||
    filters.category !== "All" ||
    filters.location !== "All";

  return (
    <div className="filterbar">
      <div className="filterbar__search">
        <input
          type="search"
          placeholder="Search by keyword — “blue backpack”, “ID card”…"
          value={filters.query}
          onChange={update("query")}
          aria-label="Search listings"
        />
      </div>

      <div className="filterbar__row">
        <label className="filterbar__field">
          <span>Status</span>
          <select value={filters.status} onChange={update("status")}>
            <option value="All">All</option>
            <option value="Lost">Lost</option>
            <option value="Found">Found</option>
          </select>
        </label>

        <label className="filterbar__field">
          <span>Category</span>
          <select value={filters.category} onChange={update("category")}>
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="filterbar__field">
          <span>Location</span>
          <select value={filters.location} onChange={update("location")}>
            <option value="All">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="filterbar__field">
          <span>Sort by</span>
          <select value={filters.sort} onChange={update("sort")}>
            <option value="recent">Most recent</option>
            <option value="relevant">Most relevant</option>
          </select>
        </label>
      </div>

      <div className="filterbar__status">
        <span>
          {resultCount} {resultCount === 1 ? "listing" : "listings"} found
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
