import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Filter,
  Pause,
  Play,
  RotateCcw,
  Search,
  Telescope,
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

const FALLBACK_SOURCE_URLS = {
  'sgr-a-star': 'https://www.wikidata.org/wiki/Q237284',
  'm87-star': 'https://www.wikidata.org/wiki/Q3841190',
  'cygnus-x-1': 'https://www.wikidata.org/wiki/Q332674',
  'v404-cygni': 'https://www.wikidata.org/wiki/Q1635586',
  'gro-j1655-40': 'https://www.wikidata.org/wiki/Q608673',
  'a0620-00': 'https://www.wikidata.org/wiki/Q279292',
  'ton-618': 'https://www.wikidata.org/wiki/Q45067390',
  'hlx-1': 'https://www.wikidata.org/wiki/Q2331297',
  'lmc-x-1': 'https://www.wikidata.org/wiki/Q2777677',
};

const PAGE_SIZE = 20;

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    && number >= 0
    && number <= Number.MAX_SAFE_INTEGER
    ? number
    : 0;
}

function wikidataSearchUrl(name) {
  return `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(name)}`;
}

function safeWikidataUrl(value, name) {
  try {
    const url = new URL(value);
    const isWikidataHost = url.hostname === 'www.wikidata.org'
      || url.hostname === 'wikidata.org';

    if (isWikidataHost && (url.protocol === 'https:' || url.protocol === 'http:')) {
      url.protocol = 'https:';
      return url.href;
    }
  } catch {
    // Invalid and non-Wikidata URLs use the safe source search below.
  }

  return wikidataSearchUrl(name);
}

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
    let isActive = true;
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 10_000);

    async function fetchBlackHoles() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(WIKIDATA_ENDPOINT, {
          headers: { Accept: 'application/sparql-results+json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Wikidata request failed');
        }

        const data = await response.json();
        const bindings = data?.results?.bindings;

        if (!Array.isArray(bindings)) {
          throw new Error('Wikidata returned an invalid payload');
        }

        const rows = dedupeBlackHoles(bindings
          .map((item, index) => {
            const name = String(
              item.blackHoleLabel?.value ?? `Wikidata object ${index + 1}`,
            ).trim();
            const type = item.typeLabel?.value ?? item.type?.value;
            const mass = toNonNegativeNumber(item.mass?.value);

            return {
              id: slugify(name) || `wikidata-${index}`,
              sourceUrl: safeWikidataUrl(item.blackHole?.value, name),
              name,
              type: normalizeType(type, mass),
              mass,
              distance: toNonNegativeNumber(item.distance?.value),
              constellation: String(
                item.constellationLabel?.value ?? 'Unknown',
              ).trim() || 'Unknown',
            };
          })
          .filter((item) => item.name && !/^Q\d+$/.test(item.name)))
          .slice(0, 40);

        if (rows.length < 10) {
          throw new Error('Wikidata returned too few usable rows');
        }

        if (isActive) {
          setBlackHoles(rows);
        }
      } catch (fetchError) {
        try {
          const fallback = await fetch('/black-holes.json');

          if (!fallback.ok) {
            throw new Error('Fallback catalog request failed');
          }

          const fallbackRows = await fallback.json();

          if (!Array.isArray(fallbackRows)) {
            throw new Error('Fallback catalog returned an invalid payload');
          }

          const rows = dedupeBlackHoles(fallbackRows
            .map((item, index) => {
              const name = String(item.name ?? `Cached object ${index + 1}`).trim();
              const id = String(item.id || slugify(name) || `cached-${index}`);
              const mass = toNonNegativeNumber(item.mass);

              return {
                ...item,
                id,
                name,
                mass,
                distance: toNonNegativeNumber(item.distance),
                constellation: String(item.constellation ?? 'Unknown').trim() || 'Unknown',
                sourceUrl: safeWikidataUrl(
                  item.sourceUrl || FALLBACK_SOURCE_URLS[id],
                  name,
                ),
                type: normalizeType(item.type, mass),
              };
            })
            .filter((item) => item.name));

          if (isActive) {
            setBlackHoles(rows);
            setError('Showing cached sample data — Wikidata is temporarily unreachable.');
          }
        } catch (fallbackError) {
          if (isActive) {
            setBlackHoles([]);
            setError('Black hole data could not be loaded. Please try again later.');
          }
        }
      } finally {
        window.clearTimeout(requestTimeout);
        if (isActive) {
          setLoading(false);
        }
      }
    }

    fetchBlackHoles();

    return () => {
      isActive = false;
      window.clearTimeout(requestTimeout);
      controller.abort();
    };
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
  largestObject,
  children,
}) {
  const [isGraphicStatic, setIsGraphicStatic] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

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
        value: `${formatNumber(averageMass)} M☉`,
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

        <p className="app-subtitle">
          Explore black holes from Wikidata and filter them by mass. Mass is
          shown in solar masses (M☉).
        </p>

        <button
          className="animation-toggle"
          type="button"
          aria-pressed={isGraphicStatic}
          onClick={() => setIsGraphicStatic((current) => !current)}
        >
          {isGraphicStatic ? <Play size={17} /> : <Pause size={17} />}
          Motion: {isGraphicStatic ? 'Off' : 'On'}
        </button>
      </div>

      <div
        id="right-panel"
        className={isGraphicStatic ? 'is-static' : ''}
        aria-hidden="true"
      >
        <div className="black-hole-graphic">
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
      </div>

      <article className="insight-card summary-insight">
        <div className="insight-heading">
          <Telescope className="insight-icon" size={36} aria-hidden="true" />
          <div>
            <span className="insight-kicker">Catalog insight</span>
            <h3>What stands out</h3>
          </div>
        </div>
        <p>
          <strong>The catalog spans enormous scales.</strong> It mixes nearby
          stellar black holes with distant giants.{' '}
          Try the Stellar filter, then switch back to All to see how
          objects like {largestObject?.name ?? 'TON 618'} stretch the scale.
        </p>
      </article>

      {children}

      <div className="hero-controls">
        <p>Minimum mass in solar masses (M☉)</p>
        <div className="slider-wrap">
          <input
            type="range"
            min="0"
            max={Math.max(massStops.length - 1, 0)}
            step="1"
            value={massStep}
            id="black-hole-slider"
            aria-label={`Minimum mass: ${formatMass(minMass)} solar masses`}
            onChange={(event) => {
              const nextStep = Math.min(
                Math.max(Math.trunc(toNonNegativeNumber(event.target.value)), 0),
                Math.max(massStops.length - 1, 0),
              );
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
          <h2>{loading ? 'Loading...' : `${formatMass(minMass)} M☉`}</h2>
        </div>
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
    </section>
  );
}

function Dashboard({ blackHoles, loading, error, filters }) {
  const location = useLocation();
  const dashboardPanelRef = useRef(null);
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

  useLayoutEffect(() => {
    if (location.state?.scrollToTable) {
      dashboardPanelRef.current?.scrollIntoView?.({
        behavior: 'auto',
        block: 'start',
      });
    }
  }, [location.state?.scrollToTable]);
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
  const catalogNavigationState = useMemo(
    () => ({
      catalogIds: sortedBlackHoles.map((item) => item.id),
      scrollToDetail: true,
    }),
    [sortedBlackHoles],
  );
  const hasFilters = query || typeFilter !== 'All' || minMass > 0;

  function handleSort(key) {
    setSortConfig((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }

      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }

      return { key: null, direction: 'asc' };
    });
    setPage(1);
  }

  function sortActionLabel(key, label) {
    if (sortConfig.key !== key) {
      return `Sort ${label} ascending`;
    }

    return sortConfig.direction === 'asc'
      ? `Sort ${label} descending`
      : `Clear ${label} sorting`;
  }

  function sortAriaValue(key) {
    if (sortConfig.key !== key) {
      return undefined;
    }

    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  }

  function sortIcon(key) {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="sort-icon" size={17} aria-hidden="true" />;
    }

    return sortConfig.direction === 'asc'
      ? <ArrowUp className="sort-icon" size={17} aria-hidden="true" />
      : <ArrowDown className="sort-icon" size={17} aria-hidden="true" />;
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
        largestObject={largestObject}
      >

        <section className="charts-panel" aria-label="Black hole charts">
        <article className="chart-card">
          <div className="chart-header">
            <h3>Catalog Mix</h3>
          </div>

          {loading ? (
            <div className="chart-loading">Loading chart data...</div>
          ) : (
            <>
              <div
                className="chart-visual"
                role="img"
                aria-label={`Catalog mix: ${typeChartData.map((entry) => `${entry.count} ${entry.type}`).join(', ')}.`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={typeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(9, 11, 25, 0.18)" />
                    <XAxis dataKey="type" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Objects">
                      {typeChartData.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] ?? TYPE_COLORS['Black hole']}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="type-legend" aria-label="Black hole type colors">
                {typeChartData.map((entry) => (
                  <li key={entry.type}>
                    <span
                      className="legend-swatch"
                      style={{ backgroundColor: TYPE_COLORS[entry.type] ?? TYPE_COLORS['Black hole'] }}
                      aria-hidden="true"
                    />
                    {entry.type}
                  </li>
                ))}
              </ul>
            </>
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
            <div
              className="chart-visual"
              role="img"
              aria-label={`Mass versus distance scatter plot with ${massDistanceData.length} black holes. The horizontal axis is mass in solar masses and the vertical axis is distance in light-years, shown on a ${scatterScale} scale.`}
            >
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
            </div>
          )}
        </article>
        </section>
      </Sidebar>

      <section ref={dashboardPanelRef} className="dashboard-panel">
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
            <span>Minimum mass (M☉)</span>
            <input
              aria-label="Minimum mass in solar masses"
              type="number"
              min="0"
              max={maxMass || undefined}
              value={minMass}
              onChange={(event) => {
                const nextMass = Math.min(
                  toNonNegativeNumber(event.target.value),
                  maxMass || 0,
                );
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
                <th aria-sort={sortAriaValue('name')}>
                  <button
                    type="button"
                    className={sortConfig.key === 'name' ? 'active' : ''}
                    aria-label={sortActionLabel('name', 'Name')}
                    title={sortActionLabel('name', 'Name')}
                    onClick={() => handleSort('name')}
                  >
                    Name
                    {sortIcon('name')}
                  </button>
                </th>
                <th aria-sort={sortAriaValue('type')}>
                  <button
                    type="button"
                    className={sortConfig.key === 'type' ? 'active' : ''}
                    aria-label={sortActionLabel('type', 'Type')}
                    title={sortActionLabel('type', 'Type')}
                    onClick={() => handleSort('type')}
                  >
                    Type
                    {sortIcon('type')}
                  </button>
                </th>
                <th aria-sort={sortAriaValue('mass')}>
                  <button
                    type="button"
                    className={sortConfig.key === 'mass' ? 'active' : ''}
                    aria-label={sortActionLabel('mass', 'Mass')}
                    title={sortActionLabel('mass', 'Mass')}
                    onClick={() => handleSort('mass')}
                  >
                    Mass
                    {sortIcon('mass')}
                  </button>
                </th>
                <th aria-sort={sortAriaValue('distance')}>
                  <button
                    type="button"
                    className={sortConfig.key === 'distance' ? 'active' : ''}
                    aria-label={sortActionLabel('distance', 'Distance')}
                    title={sortActionLabel('distance', 'Distance')}
                    onClick={() => handleSort('distance')}
                  >
                    Distance
                    {sortIcon('distance')}
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
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="table-link"
                        to={`/black-holes/${item.id}`}
                        state={catalogNavigationState}
                      >
                        <strong>{item.name}</strong>
                        <span className="table-link-cue">
                          View details
                          <ArrowRight size={15} aria-hidden="true" />
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="pill">{item.type}</span>
                    </td>
                    <td>{item.mass ? `${formatNumber(item.mass)} M☉` : 'Unknown'}</td>
                    <td>
                      {item.distance ? `${formatNumber(item.distance)} ly` : 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && filteredBlackHoles.length === 0 && (
            <div className="empty-state" role="status" aria-live="polite">
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
        <Sidebar
          blackHoles={blackHoles}
          filteredBlackHoles={visibleBlackHoles}
          loading={loading}
          minMass={filters.minMass}
          massStep={filters.massStep}
          setMassStep={filters.setMassStep}
          setMinMass={filters.setMinMass}
        />
        <section ref={detailPanelRef} className="detail-panel">
          Loading detail view...
        </section>
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
        <Sidebar
        blackHoles={blackHoles}
        filteredBlackHoles={visibleBlackHoles}
        loading={false}
        minMass={filters.minMass}
        massStep={filters.massStep}
        setMassStep={filters.setMassStep}
        setMinMass={filters.setMinMass}
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
