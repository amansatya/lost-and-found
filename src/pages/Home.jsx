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
  const { items, loading, error, refreshItems } = useItemsContext();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const lostCount = items.filter((i) => i.status === "Lost").length;
  const foundCount = items.filter((i) => i.status === "Found").length;

  const filtered = useMemo(() => {
    let list = items.filter((item) => {
      if (filters.status !== "All" && item.status !== filters.status) return false;
      if (filters.category !== "All" && item.category !== filters.category) return false;
      if (filters.location !== "All" && item.location !== filters.location) return false;

      if (filters.query.trim()) {
        return relevanceScore(item, filters.query) > 0;
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      if (filters.sort === "oldest") {
        return new Date(a.postedAt) - new Date(b.postedAt);
      }

      // Stable fallback: newest first.
      return new Date(b.postedAt) - new Date(a.postedAt);
    });

    return list;
  }, [items, filters]);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__board">
          <p className="hero__eyebrow">KIIT campus notice board</p>
          <h1 className="hero__title">
            Lost something?
            <br />
            Found something?
            <br />
            Put it on the board.
          </h1>
          <p className="hero__sub">
            One place for active lost-and-found notices across campus. Search
            by item, filter by location, and contact the person who posted it.
          </p>

          <div className="hero__actions">
            <Link to="/post/lost" className="btn btn--lost">
              Report something lost
            </Link>
            <Link to="/post/found" className="btn btn--found">
              Report something found
            </Link>
          </div>

          <div className="hero__stats" aria-label="Active board statistics">
            <div className="hero__stat">
              <strong>{items.length}</strong>
              <span>active notices</span>
            </div>
            <div className="hero__stat hero__stat--lost">
              <strong>{lostCount}</strong>
              <span>lost</span>
            </div>
            <div className="hero__stat hero__stat--found">
              <strong>{foundCount}</strong>
              <span>found</span>
            </div>
          </div>
        </div>
      </section>

      <section className="listings" aria-labelledby="board-heading">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Browse active notices</p>
            <h2 id="board-heading">The campus board</h2>
          </div>
          <p>Only active notices are shown here.</p>
        </div>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={filtered.length}
        />

        {loading ? (
          <div className="loading-state loading-state--card">
            <span className="loading-state__dot" aria-hidden="true" />
            <p>Loading the latest notices…</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="empty-state__eyebrow">Board unavailable</p>
            <p className="empty-state__title">We couldn't load the notices.</p>
            <p className="empty-state__body">{error}</p>
            <button className="btn btn--navy" onClick={refreshItems}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__eyebrow">No match</p>
            <p className="empty-state__title">Nothing matches those filters.</p>
            <p className="empty-state__body">
              Try a broader search or clear the filters. If the item is not
              already here, you can add a new notice from the buttons above.
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
