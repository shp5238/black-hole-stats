export const WIKIDATA_ENDPOINT =
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

export const TYPE_COLORS = {
  Supermassive: '#63429a',
  Intermediate: '#a2aaff',
  Stellar: '#ffa286',
  'Black hole': '#ecbdaf',
};

export const FALLBACK_SOURCE_URLS = {
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

export const PAGE_SIZE = 20;
