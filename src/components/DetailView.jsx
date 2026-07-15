import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { formatNumber } from '../utils/blackHoles.js';
import { MassFilterSummary } from './MassFilterSummary.jsx';
import { Sidebar } from './Sidebar.jsx';

export function DetailView({ blackHoles, loading, filters, dispatch }) {
  const { blackHoleId } = useParams();
  const location = useLocation();
  const detailPanelRef = useRef(null);
  const item = blackHoles.find((blackHole) => blackHole.id === blackHoleId);
  const visibleBlackHoles = blackHoles.filter(
    (blackHole) => blackHole.mass >= filters.minMass,
  );

  useLayoutEffect(() => {
    if (!loading && location.state?.scrollToDetail) {
      detailPanelRef.current?.scrollIntoView?.({
        behavior: 'auto',
        block: 'start',
      });
    }
  }, [blackHoleId, loading, location.state?.scrollToDetail]);

  if (loading) {
    return (
      <>
        <Sidebar />
        <section
          className="filtered-catalog-flow"
          aria-label="Filtered catalog"
        >
          <MassFilterSummary
            blackHoles={blackHoles}
            filteredBlackHoles={visibleBlackHoles}
            loading={loading}
            minMass={filters.minMass}
            massStep={filters.massStep}
            dispatch={dispatch}
          />
          <section ref={detailPanelRef} className="detail-panel">
            Loading detail view...
          </section>
        </section>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Sidebar />
        <section
          className="filtered-catalog-flow"
          aria-label="Filtered catalog"
        >
          <MassFilterSummary
            blackHoles={blackHoles}
            filteredBlackHoles={visibleBlackHoles}
            loading={false}
            minMass={filters.minMass}
            massStep={filters.massStep}
            dispatch={dispatch}
          />
          <section ref={detailPanelRef} className="detail-panel">
          <Link className="back-link" to="/" state={{ scrollToTable: true }}>
            <ArrowLeft size={18} />
            Back to dashboard
          </Link>
          <div className="detail-heading">
            <h2>Black hole not found</h2>
            <p>No catalog object matches /black-holes/{blackHoleId}.</p>
          </div>
          </section>
        </section>
      </>
    );
  }

  const eventHorizonMiles = item.mass ? item.mass * 3.7 : 0;
  const massRank = [...visibleBlackHoles]
    .sort((a, b) => b.mass - a.mass)
    .findIndex((blackHole) => blackHole.id === item.id) + 1;
  const navigationObjects = Array.isArray(location.state?.catalogIds)
    ? location.state.catalogIds
      .map((id) => blackHoles.find((blackHole) => blackHole.id === id))
      .filter(Boolean)
    : blackHoles;
  const currentIndex = navigationObjects.findIndex((blackHole) => blackHole.id === item.id);
  const previousObject = currentIndex > 0 ? navigationObjects[currentIndex - 1] : null;
  const nextObject = currentIndex >= 0 && currentIndex < navigationObjects.length - 1
    ? navigationObjects[currentIndex + 1]
    : null;

  return (
    <>
      <Sidebar />
      <section
        className="filtered-catalog-flow"
        aria-label="Filtered catalog"
      >
        <MassFilterSummary
          blackHoles={blackHoles}
          filteredBlackHoles={visibleBlackHoles}
          loading={false}
          minMass={filters.minMass}
          massStep={filters.massStep}
          dispatch={dispatch}
        />
        <section ref={detailPanelRef} className="detail-panel">
        <Link className="back-link" to="/" state={{ scrollToTable: true }}>
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>
        <div className="detail-heading">
          <span className="pill">{item.type}</span>
          <h2>{item.name}</h2>
          <p>{item.constellation} constellation</p>
        </div>

        <div className="detail-grid">
          <div className="custom-card">
            <div className="card-bg"></div>
            <h3>Mass</h3>
            <p>{item.mass ? `${formatNumber(item.mass)} M☉` : 'Unknown'}</p>
            <span className="card-detail">
              {massRank > 0 ? `Rank #${massRank} among visible objects` : 'Hidden by current mass filter'}
            </span>
          </div>
          <div className="custom-card">
            <div className="card-bg"></div>
            <h3>Distance</h3>
            <p>{item.distance ? `${formatNumber(item.distance)} ly` : 'Unknown'}</p>
            <span className="card-detail">Distance from Earth</span>
          </div>
          <div className="custom-card">
            <div className="card-bg"></div>
            <h3>Event Horizon</h3>
            <p>{eventHorizonMiles ? `${formatNumber(eventHorizonMiles, 0)} mi` : 'Unknown'}</p>
            <span className="card-detail">Estimated Schwarzschild radius</span>
          </div>
        </div>

        <p className="detail-copy">
          This object is classified as {item.type.toLowerCase()} and is listed in
          the {item.constellation} constellation. Its source record is{' '}
          <a
            className="detail-permalink"
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${item.name} on Wikidata in a new tab`}
          >
            <ExternalLink size={16} aria-hidden="true" />
            View {item.name} on Wikidata
          </a>
          .
        </p>

        <nav className="detail-nav" aria-label="Related black holes">
          {previousObject && (
            <Link to={`/black-holes/${previousObject.id}`} state={location.state}>
              Previous: {previousObject.name}
            </Link>
          )}
          {nextObject && (
            <Link to={`/black-holes/${nextObject.id}`} state={location.state}>
              Next: {nextObject.name}
            </Link>
          )}
        </nav>
        </section>
      </section>
    </>
  );
}
