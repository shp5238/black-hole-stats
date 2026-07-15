export function toNonNegativeNumber(value) {
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

export function safeWikidataUrl(value, name) {
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

export function normalizeType(type, mass = 0) {
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

export function dedupeBlackHoles(rows) {
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

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export function formatMass(value) {
  return formatNumber(value, value > 0 && value < 100 ? 1 : 0);
}

