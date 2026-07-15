import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Telescope } from 'lucide-react';

export function Sidebar({ largestObject, children }) {
  const [isGraphicStatic, setIsGraphicStatic] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

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

      <section
        className="catalog-overview"
        aria-labelledby="catalog-overview-heading"
      >
        <article className="insight-card summary-insight">
          <div className="insight-heading">
            <Telescope className="insight-icon" size={36} aria-hidden="true" />
            <div>
              <span className="insight-kicker">Full catalog overview</span>
              <h2 id="catalog-overview-heading">What stands out</h2>
            </div>
          </div>
          <p>
            <strong>The catalog spans enormous scales.</strong> It mixes nearby
            stellar black holes with distant giants. The charts below show how
            objects like {largestObject?.name ?? 'TON 618'} stretch that scale.
          </p>
        </article>

        {children}
      </section>
    </section>
  );
}
