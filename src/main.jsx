import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Filter,
  Search,
} from 'lucide-react';
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

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatMass(value) {
  return formatNumber(value, value > 0 && value < 100 ? 1 : 0);
}

export function App() {
  const [blackHoles, setBlackHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [minMass, setMinMass] = useState(0);
  const [massStep, setMassStep] = useState(0);

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
              id: item.blackHole?.value ?? `wikidata-${index}`,
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

  const types = useMemo(
    () => ['All', ...new Set(blackHoles.map((item) => item.type))],
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

  const stats = useMemo(() => {
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
        detail: `${filteredBlackHoles.length} visible`,
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
  }, [blackHoles.length, filteredBlackHoles]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div id="left-panel">
          <h1>Black Hole Stats</h1>
          
          <p>Slide to filter by mass!</p>
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
            <h2>{formatMass(minMass)} M solar</h2>
          </div>

          <div className="card-organizer" aria-label="Dashboard summary">
            {stats.map((stat) => (
              <custom-card key={stat.label}>
                <div className="card-bg"></div>
                <h3>{stat.label}</h3>
                <p>{stat.value}</p>
                <span className="card-detail">{stat.detail}</span>
              </custom-card>
            ))}
          </div>
        </div>

        <div id="right-panel" aria-hidden="true">
          <custom-swirl id="s1">
            <custom-circ className="ctop"></custom-circ>
            <custom-circ className="cbottom"></custom-circ>
          </custom-swirl>

          <custom-swirl id="s2">
            <custom-circ className="ctop"></custom-circ>
            <custom-circ className="cbottom"></custom-circ>
          </custom-swirl>

          <custom-swirl id="s3">
            <custom-circ className="ctop"></custom-circ>
            <custom-circ className="cbottom"></custom-circ>
          </custom-swirl>

          <black-hole></black-hole>
        </div>
      </section>

      <section className="dashboard-panel">
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
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="control">
            <span>
              <Filter size={17} />
              Type
            </span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {types.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

        </div>

        {error && (
          <p className="notice">
            <AlertCircle size={17} />
            {error}
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Mass</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4">Loading the observatory feed...</td>
                </tr>
              ) : (
                filteredBlackHoles.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
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
      </section>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
