import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useItemsContext } from "../hooks/ItemsContext";
import FilterBar from "../components/FilterBar";
import ItemCard from "../components/ItemCard";
import { relevanceScore } from "../utils/format";

const DEFAULT_FILTERS = {
  query: "",
  status: "All",
  category: "All",
  location: "All",
  sort: "recent",
};

export default function Home() {
  const { items } = useItemsContext();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const lostCount = items.filter((i) => i.status === "Lost").length;
  const foundCount = items.filter((i) => i.status === "Found").length;

  const filtered = useMemo(() => {
    let list = items.filter((item) => {
      if (filters.status !== "All" && item.status !== filters.status) return false;
      if (filters.category !== "All" && item.category !== filters.category)
        return false;
      if (filters.location !== "All" && item.location !== filters.location)
        return false;
      if (filters.query) {
        return relevanceScore(item, filters.query) > 0;
      }
      return true;
    });

    if (filters.sort === "relevant" && filters.query) {
      list = [...list].sort(
        (a, b) =>
          relevanceScore(b, filters.query) - relevanceScore(a, filters.query)
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
      );
    }

    return list;
  }, [items, filters]);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__board">
          <p className="hero__eyebrow">Notice board · updated daily</p>
          <h1 className="hero__title">
            If it's missing on campus,
            <br />
            it's probably pinned here.
          </h1>
          <p className="hero__sub">
            Post what you've lost, post what you've found, and let the board do
            the matching. {lostCount} lost, {foundCount} found — and counting.
          </p>
          <div className="hero__actions">
            <Link to="/post/lost" className="btn btn--lost">
              I lost something
            </Link>
            <Link to="/post/found" className="btn btn--found">
              I found something
            </Link>
          </div>
        </div>
      </section>

      <section className="listings">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={filtered.length}
        />

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">Nothing pinned here yet.</p>
            <p className="empty-state__body">
              Try a different keyword, or widen your filters. If you're the one
              missing something, be the first to post it.
            </p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
