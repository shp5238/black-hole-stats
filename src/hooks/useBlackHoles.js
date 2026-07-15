import { useEffect, useState } from 'react';
import { FALLBACK_SOURCE_URLS, WIKIDATA_ENDPOINT } from '../constants.js';
import {
  dedupeBlackHoles,
  normalizeType,
  safeWikidataUrl,
  slugify,
  toNonNegativeNumber,
} from '../utils/blackHoles.js';

export function useBlackHoles() {
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

