import { useMemo } from 'react';
import { FILTER_ACTIONS } from '../state/filterReducer.js';
import {
  formatMass,
  formatNumber,
  toNonNegativeNumber,
} from '../utils/blackHoles.js';

export function MassFilterSummary({
  blackHoles,
  filteredBlackHoles,
  loading,
  minMass,
  massStep,
  dispatch,
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
        { label: 'Matching Objects', value: 'Loading', detail: 'observatory feed' },
        { label: 'Average Mass', value: 'Loading', detail: 'based on matching rows' },
        { label: 'Farthest Distance', value: 'Loading', detail: 'among matching rows' },
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
        label: 'Matching Objects',
        value: filteredBlackHoles.length,
        detail: `${filteredBlackHoles.length} of ${blackHoles.length} visible`,
      },
      {
        label: 'Average Mass',
        value: `${formatNumber(averageMass)} M☉`,
        detail: 'based on matching rows',
      },
      {
        label: 'Farthest Distance',
        value: `${formatNumber(farthestDistance)} ly`,
        detail: 'among matching rows',
      },
    ];
  }, [blackHoles.length, filteredBlackHoles, loading]);

  function setMassStop(nextStep) {
    const boundedStep = Math.min(
      Math.max(nextStep, 0),
      Math.max(massStops.length - 1, 0),
    );

    dispatch({
      type: FILTER_ACTIONS.SET_MASS_STOP,
      massStep: boundedStep,
      minMass: massStops[boundedStep] ?? 0,
    });
  }

  return (
    <section className="filter-summary" aria-labelledby="mass-filter-heading">
      <div className="action-heading">
        <span className="section-eyebrow">Filter the catalog</span>
        <h2 id="mass-filter-heading">Choose a minimum mass</h2>
        <p id="mass-filter-help">
          The summary cards and catalog table below update to match this
          threshold.
        </p>
      </div>

      <div className="mass-reading">
        <span>Current threshold</span>
        <output
          id="current-mass-output"
          htmlFor="black-hole-slider"
          aria-label="Current minimum mass"
          aria-live="polite"
        >
          {loading ? 'Loading...' : `${formatMass(minMass)} M☉`}
        </output>
      </div>

      <div className="slider-wrap">
        <label htmlFor="black-hole-slider">
          Minimum mass in solar masses (M☉)
        </label>
        <div className="slider-track">
          <input
            type="range"
            min="0"
            max={Math.max(massStops.length - 1, 0)}
            step="1"
            value={massStep}
            id="black-hole-slider"
            style={{
              '--slider-position': `${
                massStops.length > 1
                  ? (massStep / (massStops.length - 1)) * 100
                  : 0
              }%`,
            }}
            aria-label={`Minimum mass: ${formatMass(minMass)} solar masses`}
            aria-describedby="mass-filter-help current-mass-output"
            onChange={(event) => {
              setMassStop(Math.trunc(toNonNegativeNumber(event.target.value)));
            }}
          />

          <div className="slider-labels" aria-hidden="true">
            <span>0</span>
            <span>{formatNumber(maxMass || 100, 0)}</span>
          </div>
        </div>
      </div>

      <div className="card-organizer" aria-label="Filtered catalog summary">
        {stats.map((stat) => (
          <article className="custom-card" key={stat.label}>
            <div className="card-bg"></div>
            <h3>{stat.label}</h3>
            <p>{stat.value}</p>
            <span className="card-detail">{stat.detail}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
