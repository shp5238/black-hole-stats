import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
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
import { PAGE_SIZE, TYPE_COLORS } from '../constants.js';
import { FILTER_ACTIONS } from '../state/filterReducer.js';
import { formatNumber, toNonNegativeNumber } from '../utils/blackHoles.js';
import { MassFilterSummary } from './MassFilterSummary.jsx';
import { Sidebar } from './Sidebar.jsx';

export function Dashboard({ blackHoles, loading, error, filters, dispatch }) {
  const location = useLocation();
  const dashboardPanelRef = useRef(null);
  const { query, typeFilter, minMass } = filters;
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
    dispatch({ type: FILTER_ACTIONS.RESET });
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
      <Sidebar largestObject={largestObject}>
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

      <section
        className="filtered-catalog-flow"
        aria-label="Filtered catalog"
      >
        <MassFilterSummary
          blackHoles={blackHoles}
          filteredBlackHoles={filteredBlackHoles}
          loading={loading}
          minMass={filters.minMass}
          massStep={filters.massStep}
          dispatch={dispatch}
        />

        <section ref={dashboardPanelRef} className="dashboard-panel">
        <div id="dashboard-content" className="section-anchor"></div>
        <header className="dashboard-heading">
          <h2>Explore matching objects</h2>
        </header>
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
                dispatch({
                  type: FILTER_ACTIONS.SET_QUERY,
                  value: event.target.value,
                });
                setPage(1);
              }}
            />
            {query && (
              <button
                className="field-button"
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  dispatch({ type: FILTER_ACTIONS.SET_QUERY, value: '' });
                  setPage(1);
                }}
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
                dispatch({
                  type: FILTER_ACTIONS.SET_TYPE_FILTER,
                  value: event.target.value,
                });
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
                dispatch({
                  type: FILTER_ACTIONS.SET_MIN_MASS,
                  value: nextMass,
                });
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
          <p className="notice" role="status">
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

        <div
          className="table-wrap"
          role="region"
          aria-label="Black hole results table"
          tabIndex="0"
        >
          <table>
            <caption className="sr-only">
              Black holes matching the current filters
            </caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={sortAriaValue('name')}>
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
                <th scope="col" aria-sort={sortAriaValue('type')}>
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
                <th scope="col" aria-sort={sortAriaValue('mass')}>
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
                <th scope="col" aria-sort={sortAriaValue('distance')}>
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
                    <td data-label="Name">
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
                    <td data-label="Type">
                      <span className="pill">{item.type}</span>
                    </td>
                    <td data-label="Mass">
                      {item.mass ? `${formatNumber(item.mass)} M☉` : 'Unknown'}
                    </td>
                    <td data-label="Distance">
                      {item.distance ? `${formatNumber(item.distance)} ly` : 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && filteredBlackHoles.length === 0 && (
            <div
              className="empty-state"
              role="status"
              aria-label="No matching black holes"
              aria-live="polite"
            >
              No black holes match the current dashboard filters.
            </div>
          )}
        </div>

        {!loading && sortedBlackHoles.length > PAGE_SIZE && (
          <nav className="pagination" aria-label="Table pagination">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span aria-live="polite" aria-atomic="true">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
        </section>
      </section>
    </>
  );
}
