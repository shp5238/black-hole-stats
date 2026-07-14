import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Filter,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const WIKIDATA_ENDPOINT =
  'https://query.wikidata.org/sparql?query=' +
  encodeURIComponent(`
SELECT ?blackHole ?blackHoleLabel ?typeLabel ?mass ?distance ?constellationLabel WHERE {
  ?blackHole wdt:P31/wdt:P279* wd:Q589 .
  OPTIONAL { ?blackHole wdt:P279 ?type. }
  OPTIONAL { ?blackHole wdt:P2067 ?mass. }
  OPTIONAL { ?blackHole wdt:P2583 ?distance. }
  OPTIONAL { ?blackHole wdt:P59 ?constellation. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 80
`) +
  '&format=json';

const TYPE_COLORS = {
  Supermassive: '#63429a',
  Intermediate: '#a2aaff',
  Stellar: '#ffa286',
  'Black hole': '#ecbdaf',
};

const PAGE_SIZE = 20;

function normalizeType(type, mass = 0) {
  const normalizedType = String(type ?? '').toLowerCase();

  if (normalizedType.includes('supermassive')) {
    return 'Supermassive';
  }

  if (normalizedType.includes('intermediate')) {
    return 'Intermediate';
  }

  if (normalizedType.includes('stellar')) {
    return 'Stellar';
  }

  if (mass >= 100_000) {
    return 'Supermassive';
  }

  if (mass >= 100) {
    return 'Intermediate';
  }

  if (mass > 0) {
    return 'Stellar';
  }

  return 'Black hole';
}

function typeRank(type) {
  return {
    Supermassive: 4,
    Intermediate: 3,
    Stellar: 2,
    'Black hole': 1,
  }[type] ?? 0;
}

function dedupeBlackHoles(rows) {
  const byObject = new Map();

  rows.forEach((item) => {
    const key = item.name.trim().toLowerCase();
    const current = byObject.get(key);

    if (!current || typeRank(item.type) > typeRank(current.type)) {
      byObject.set(key, item);
    }
  });

  return [...byObject.values()];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatMass(value) {
  return formatNumber(value, value > 0 && value < 100 ? 1 : 0);
}

function useBlackHoles() {
  const [blackHoles, setBlackHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBlackHoles() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(WIKIDATA_ENDPOINT, {
          headers: { Accept: 'application/sparql-results+json' },
        });

        if (!response.ok) {
          throw new Error('Wikidata request failed');
        }

        const data = await response.json();
        const rows = dedupeBlackHoles(data.results.bindings
          .map((item, index) => {
            const type = item.typeLabel?.value ?? item.type;
            const mass = Number(item.mass?.value ?? 0);

            return {
              id: slugify(item.blackHoleLabel?.value ?? `wikidata-${index}`),
              sourceUrl: item.blackHole?.value ?? '',
              name: item.blackHoleLabel?.value ?? 'Unnamed black hole',
              type: normalizeType(type, mass),
              mass,
              distance: Number(item.distance?.value ?? 0),
              constellation: item.constellationLabel?.value ?? 'Unknown',
            };
          })
          .filter((item) => !item.name.startsWith('Q')))
          .slice(0, 40);

        if (rows.length < 10) {
          throw new Error('Wikidata returned too few usable rows');
        }

        setBlackHoles(rows);
      } catch (fetchError) {
        const fallback = await fetch('/black-holes.json');
        const fallbackRows = await fallback.json();
        setBlackHoles(
          dedupeBlackHoles(
            fallbackRows.map((item) => ({
              ...item,
              id: item.id || slugify(item.name),
              type: normalizeType(item.type, item.mass),
            })),
          ),
        );
        setError('Live Wikidata data is unavailable, so sample data is shown.');
      } finally {
        setLoading(false);
      }
    }

    fetchBlackHoles();
  }, []);

  return { blackHoles, loading, error };
}

function Sidebar({
  blackHoles,
  filteredBlackHoles,
  loading,
  minMass,
  massStep,
  setMassStep,
  setMinMass,
}) {
  const maxMass = useMemo(
    () => Math.max(...blackHoles.map((item) => item.mass), 0),
    [blackHoles],
  );

  const massStops = useMemo(() => {
    const stops = blackHoles
      .map((item) => item.mass)
      .filter((mass) => mass > 0)
      .sort((a, b) => a - b);

    return [0, ...new Set(stops)];
  }, [blackHoles]);

  const stats = useMemo(() => {
    if (loading) {
      return [
        {
          label: 'Catalog Objects',
          value: 'Loading',
          detail: 'observatory feed',
        },
        {
          label: 'Average Mass',
          value: 'Loading',
          detail: 'based on filtered rows',
        },
        {
          label: 'Farthest Distance',
          value: 'Loading',
          detail: 'largest listed distance',
        },
      ];
    }

    const masses = filteredBlackHoles.map((item) => item.mass).filter(Boolean);
    const distances = filteredBlackHoles
      .map((item) => item.distance)
      .filter(Boolean);
    const averageMass =
      masses.reduce((total, value) => total + value, 0) / (masses.length || 1);
    const farthestDistance = Math.max(...distances, 0);

    return [
      {
        label: 'Catalog Objects',
        value: filteredBlackHoles.length,
        detail: `${filteredBlackHoles.length} of ${blackHoles.length} visible`,
      },
      {
        label: 'Average Mass',
        value: `${formatNumber(averageMass)} M solar`,
        detail: 'based on filtered rows',
      },
      {
        label: 'Farthest Distance',
        value: `${formatNumber(farthestDistance)} ly`,
        detail: 'largest listed distance',
      },
    ];
  }, [blackHoles.length, filteredBlackHoles, loading]);

  return (
    <section className="hero">
      <div id="left-panel">
        <Link className="brand-link" to="/">
          <h1>Black Hole Stats</h1>
        </Link>
          
        <p>Slide to filter by mass, or type a minimum mass.</p>
        <div className="slider-wrap">
          <input
            type="range"
            min="0"
            max={Math.max(massStops.length - 1, 0)}
            step="1"
            value={massStep}
            id="black-hole-slider"
            aria-label={`Minimum mass: ${formatMass(minMass)} M solar`}
            onChange={(event) => {
              const nextStep = Number(event.target.value);
              setMassStep(nextStep);
              setMinMass(massStops[nextStep] ?? 0);
            }}
          />

          <div className="slider-labels">
            <span>0</span>
            <span>{formatNumber(maxMass || 100, 0)}</span>
          </div>
        </div>

        <div id="current-mass">
          <h2>{loading ? 'Loading...' : `${formatMass(minMass)} M solar`}</h2>
        </div>

        <div className="card-organizer" aria-label="Dashboard summary">
          {stats.map((stat) => (
            <div className="custom-card" key={stat.label}>
              <div className="card-bg"></div>
              <h3>{stat.label}</h3>
              <p>{stat.value}</p>
              <span className="card-detail">{stat.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div id="right-panel" aria-hidden="true">
        <div className="custom-swirl" id="s1">
          <span className="ctop"></span>
          <span className="cbottom"></span>
        </div>

        <div className="custom-swirl" id="s2">
          <span className="ctop"></span>
          <span className="cbottom"></span>
        </div>

        <div className="custom-swirl" id="s3">
          <span className="ctop"></span>
          <span className="cbottom"></span>
        </div>

        <div className="black-hole"></div>
      </div>
    </section>
  );
}

function Dashboard({ blackHoles, loading, error, filters }) {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    minMass,
    setMinMass,
    setMassStep,
  } = filters;
  const [scatterScale, setScatterScale] = useState('log');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const types = useMemo(
    () => ['All', ...new Set(blackHoles.map((item) => item.type))],
    [blackHoles],
  );

  const maxMass = useMemo(
    () => Math.max(...blackHoles.map((item) => item.mass), 0),
    [blackHoles],
  );

  const filteredBlackHoles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return blackHoles.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.constellation.toLowerCase().includes(normalizedQuery);
      const matchesType =
        typeFilter === 'All' ||
        item.type?.toLowerCase() === typeFilter.toLowerCase();
      const matchesMass = item.mass >= minMass;

      return matchesSearch && matchesType && matchesMass;
    });
  }, [blackHoles, minMass, query, typeFilter]);

  const sortedBlackHoles = useMemo(() => {
    if (!sortConfig.key) {
      return filteredBlackHoles;
    }

    return [...filteredBlackHoles].sort((a, b) => {
      const first = a[sortConfig.key];
      const second = b[sortConfig.key];
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (typeof first === 'number' && typeof second === 'number') {
        return (first - second) * direction;
      }

      return String(first).localeCompare(String(second)) * direction;
    });
  }, [filteredBlackHoles, sortConfig]);

  const pageCount = Math.max(Math.ceil(sortedBlackHoles.length / PAGE_SIZE), 1);
  const visibleRows = sortedBlackHoles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = query || typeFilter !== 'All' || minMass > 0;

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }

      return {
        key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
    setPage(1);
  }

  function sortLabel(key, label) {
    if (sortConfig.key !== key) {
      return `${label} sort inactive`;
    }

    return `${label} sorted ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`;
  }

  function resetFilters() {
    setQuery('');
    setTypeFilter('All');
    setMinMass(0);
    setMassStep(0);
    setPage(1);
  }

  const typeChartData = useMemo(
    () => types
      .filter((type) => type !== 'All')
      .map((type) => ({
        type,
        count: blackHoles.filter((item) => item.type === type).length,
      })),
    [blackHoles, types],
  );

  const massDistanceData = useMemo(
    () => blackHoles
      .filter((item) => item.mass > 0 && item.distance > 0)
      .map((item) => ({
        name: item.name,
        type: item.type,
        mass: item.mass,
        distance: item.distance,
        massLog: Math.log10(item.mass),
        distanceLog: Math.log10(item.distance),
      })),
    [blackHoles],
  );

  const largestObject = useMemo(
    () => blackHoles.reduce((largest, item) => (
      item.mass > (largest?.mass ?? 0) ? item : largest
    ), null),
    [blackHoles],
  );

  return (
    <>
      <Sidebar
        blackHoles={blackHoles}
        filteredBlackHoles={filteredBlackHoles}
        loading={loading}
        minMass={filters.minMass}
        massStep={filters.massStep}
        setMassStep={filters.setMassStep}
        setMinMass={filters.setMinMass}
      />

      <section className="charts-panel" aria-label="Black hole charts">
        <article className="insight-card">
          <h3>What stands out</h3>
          <p>
            The catalog mixes nearby stellar black holes with distant giants, so
            the biggest masses can overwhelm everything else. Try the Stellar
            filter to compare compact objects, then switch back to All to see
            how objects like {largestObject?.name ?? 'TON 618'} stretch the scale.
          </p>
        </article>

        <article className="chart-card">
          <div className="chart-header">
            <h3>Catalog Mix</h3>
          </div>

          {loading ? (
            <div className="chart-loading">Loading chart data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(9, 11, 25, 0.18)" />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Objects">
                  {typeChartData.map((entry, index) => (
                    <Cell
                      key={entry.type}
                      fill={TYPE_COLORS[entry.type] ?? TYPE_COLORS['Black hole']}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="chart-card">
          <div className="chart-header">
            <h3>Mass vs Distance</h3>
            <div className="chart-toggle" aria-label="Choose scatter plot scale">
              <button
                type="button"
                aria-pressed={scatterScale === 'log'}
                className={scatterScale === 'log' ? 'active' : ''}
                onClick={() => setScatterScale('log')}
              >
                Log
              </button>
              <button
                type="button"
                aria-pressed={scatterScale === 'linear'}
                className={scatterScale === 'linear' ? 'active' : ''}
                onClick={() => setScatterScale('linear')}
              >
                Linear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="chart-loading">Loading chart data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(9, 11, 25, 0.18)" />
                <XAxis
                  dataKey={scatterScale === 'log' ? 'massLog' : 'mass'}
                  name={scatterScale === 'log' ? 'log mass' : 'mass'}
                  type="number"
                />
                <YAxis
                  dataKey={scatterScale === 'log' ? 'distanceLog' : 'distance'}
                  name={scatterScale === 'log' ? 'log distance' : 'distance'}
                  type="number"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value) => (
                    scatterScale === 'log' ? formatNumber(10 ** value) : formatNumber(value)
                  )}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                />
                <Legend />
                <Scatter name="Objects" data={massDistanceData} fill="#63429a" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </article>
      </section>

      <section className="dashboard-panel">
        <div id="dashboard-content" className="section-anchor"></div>
        <div className="toolbar">
          <label className="control search-control">
            <span>
              <Search size={17} />
              Search
            </span>
            <input
              type="search"
              placeholder="Try Sagittarius, Cygnus, M87..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            {query && (
              <button
                className="field-button"
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                <X size={17} />
              </button>
            )}
          </label>

          <label className="control">
            <span>
              <Filter size={17} />
              Type
            </span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              {types.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            <span>Mass floor</span>
            <input
              aria-label="Mass floor numeric input"
              type="number"
              min="0"
              max={maxMass || undefined}
              value={minMass}
              onChange={(event) => {
                const nextMass = Math.max(Number(event.target.value) || 0, 0);
                setMinMass(nextMass);
                setMassStep(0);
                setPage(1);
              }}
            />
          </label>

          <button
            className="reset-button"
            type="button"
            disabled={!hasFilters}
            onClick={resetFilters}
          >
            <RotateCcw size={17} />
            Reset filters
          </button>
        </div>

        {error && !noticeDismissed && (
          <p className="notice">
            <AlertCircle size={17} />
            {error}
            <button
              type="button"
              aria-label="Dismiss notice"
              onClick={() => setNoticeDismissed(true)}
            >
              <X size={16} />
            </button>
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => handleSort('name')}>
                    Name
                    <span>{sortLabel('name', 'Name')}</span>
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort('type')}>
                    Type
                    <span>{sortLabel('type', 'Type')}</span>
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort('mass')}>
                    Mass
                    <span>{sortLabel('mass', 'Mass')}</span>
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort('distance')}>
                    Distance
                    <span>{sortLabel('distance', 'Distance')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4">Loading the observatory feed...</td>
                </tr>
              ) : (
                visibleRows.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/black-holes/${item.id}`)}
                  >
                    <td>
                      <Link
                        className="table-link"
                        to={`/black-holes/${item.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <strong>{item.name}</strong>
                      </Link>
                    </td>
                    <td>
                      <span className="pill">{item.type}</span>
                    </td>
                    <td>{item.mass ? `${formatNumber(item.mass)} M solar` : 'Unknown'}</td>
                    <td>
                      {item.distance ? `${formatNumber(item.distance)} ly` : 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && filteredBlackHoles.length === 0 && (
            <div className="empty-state">
              No black holes match the current dashboard filters.
            </div>
          )}
        </div>

        {!loading && sortedBlackHoles.length > PAGE_SIZE && (
          <div className="pagination" aria-label="Table pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function DetailView({ blackHoles, loading, filters }) {
  const { blackHoleId } = useParams();
  const item = blackHoles.find((blackHole) => blackHole.id === blackHoleId);
  const visibleBlackHoles = blackHoles.filter(
    (blackHole) => blackHole.mass >= filters.minMass,
  );

  if (loading) {
    return (
      <>
        <Sidebar
          blackHoles={blackHoles}
          filteredBlackHoles={visibleBlackHoles}
          loading={loading}
          minMass={filters.minMass}
          massStep={filters.massStep}
          setMassStep={filters.setMassStep}
          setMinMass={filters.setMinMass}
        />
        <section className="detail-panel">Loading detail view...</section>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Sidebar
          blackHoles={blackHoles}
          filteredBlackHoles={visibleBlackHoles}
          loading={false}
          minMass={filters.minMass}
          massStep={filters.massStep}
          setMassStep={filters.setMassStep}
          setMinMass={filters.setMinMass}
        />
        <section className="detail-panel">
          <Link className="back-link" to="/">
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <div className="detail-heading">
            <h2>Black hole not found</h2>
            <p>No catalog object matches /black-holes/{blackHoleId}.</p>
          </div>
        </section>
      </>
    );
  }

  const eventHorizonMiles = item.mass ? item.mass * 3.7 : 0;
  const massRank = [...visibleBlackHoles]
    .sort((a, b) => b.mass - a.mass)
    .findIndex((blackHole) => blackHole.id === item.id) + 1;
  const currentIndex = blackHoles.findIndex((blackHole) => blackHole.id === item.id);
  const previousObject = blackHoles[(currentIndex - 1 + blackHoles.length) % blackHoles.length];
  const nextObject = blackHoles[(currentIndex + 1) % blackHoles.length];

  return (
    <>
        <Sidebar
        blackHoles={blackHoles}
        filteredBlackHoles={visibleBlackHoles}
        loading={false}
        minMass={filters.minMass}
        massStep={filters.massStep}
        setMassStep={filters.setMassStep}
        setMinMass={filters.setMinMass}
      />

      <section className="detail-panel">
        <Link className="back-link" to="/">
          <ArrowLeft size={18} />
          Dashboard
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
            <p>{item.mass ? `${formatNumber(item.mass)} M solar` : 'Unknown'}</p>
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
          the {item.constellation} constellation. Its dedicated route is
          <strong> /black-holes/{item.id}</strong>, so it can be opened directly.
        </p>

        <nav className="detail-nav" aria-label="Related black holes">
          {previousObject && (
            <Link to={`/black-holes/${previousObject.id}`}>Previous: {previousObject.name}</Link>
          )}
          {nextObject && (
            <Link to={`/black-holes/${nextObject.id}`}>Next: {nextObject.name}</Link>
          )}
        </nav>
      </section>
    </>
  );
}

export function App() {
  const { blackHoles, loading, error } = useBlackHoles();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [minMass, setMinMass] = useState(0);
  const [massStep, setMassStep] = useState(0);
  const filters = {
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    minMass,
    setMinMass,
    massStep,
    setMassStep,
  };

  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main className="app-shell" id="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                blackHoles={blackHoles}
                loading={loading}
                error={error}
                filters={filters}
              />
            }
          />
          <Route
            path="/black-holes/:blackHoleId"
            element={
              <DetailView
                blackHoles={blackHoles}
                loading={loading}
                filters={filters}
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
