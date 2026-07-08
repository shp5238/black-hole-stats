# Web Development Project 5 - *Black Hole Stats*

Submitted by: **Shreya Pasupuleti**

This web app: **A React + Vite data dashboard that fetches black hole catalog data, shows summary statistics, and lets users search and filter the list.**

Time spent: **7** hours spent in total

## Required Features

The following **required** functionality is completed:

- [X] **The site has a dashboard displaying a list of data fetched using an API call**
  - The dashboard should display at least 10 unique items, one per row
  - The dashboard includes at least two features in each row
- [X] **`useEffect` React hook and `async`/`await` are used**
- [X] **The app dashboard includes at least three summary statistics about the data** 
    - The app dashboard includes at least three summary statistics about the data, such as:
    - Catalog Objects: the number of black holes currently visible after filters are applied
    - Average Mass: the average mass of the currently visible black holes, displayed in solar masses
    - Farthest Distance: the largest listed distance among the currently visible black holes, displayed in light years
- [X] **A search bar allows the user to search for an item in the fetched data**
  - The search bar **correctly** filters items in the list, only displaying items matching the search query
  - The list of results dynamically updates as the user types into the search bar
- [X] **An additional filter allows the user to restrict displayed items by specified categories**
  - The filter restricts items in the list using a **different attribute** than the search bar 
  - The filter **correctly** filters items in the list, only displaying items matching the filter attribute in the dashboard
  - The dashboard list dynamically updates as the user adjusts the filter

The following **optional** features are implemented:

- [X] Multiple filters can be applied simultaneously
- [X] Filters use different input types
  - e.g., as a text input, a dropdown or radio selection, and/or a slider
- [ ] The user can enter specific bounds for filter values

The following **additional** features are implemented:

* [X] Custom CSS black hole graphic with glowing swirl elements
* [X] Wikidata fallback data so the dashboard still works if the live API is unavailable
* [X] Deduping and type normalization for live Wikidata results
* [X] Snapping mass slider that jumps between real catalog mass values for better usability
* [X] Automated tests for loading, searching, filtering, combined filters, slider behavior, and duplicate live API rows

## Video Walkthrough

Here's a walkthrough of implemented user stories:

![Video Walkthrough](walkthrough.gif)

GIF created with Kap for macOS.

## API

The dashboard attempts to fetch live data from the Wikidata SPARQL endpoint. If the live request fails, it falls back to `public/black-holes.json` so the project remains demo-ready.

The app requests black hole entries with their label, type, mass, distance, and constellation. Because Wikidata data can be inconsistent, the app normalizes classifications into `Supermassive`, `Intermediate`, `Stellar`, or `Black hole`, removes duplicate object names, and ignores rows that only have raw Wikidata IDs instead of readable labels.

## Running the Project

```bash
pnpm install
pnpm run dev
```

To run tests:

```bash
pnpm test
```

## Notes

The biggest challenge was making live Wikidata data reliable enough for a clean dashboard. Some rows came back with duplicate black hole names, very generic types, missing fields, or raw `Q` identifiers instead of readable labels. I handled this by deduping rows by object name, preferring the most specific type available, inferring a type from mass when needed, and falling back to a local JSON catalog if the live request fails or returns too few usable rows.

Another challenge was making the mass filter usable. Black hole masses vary from single digits to tens of billions of solar masses, so a normal linear slider would make most smaller objects impossible to select precisely. I changed the slider to snap through the actual mass values in the current catalog, which makes filtering predictable while still keeping the UI simple.

Styling the custom black hole graphic was also tricky because it needed to look dramatic without blocking the dashboard controls or table. I used layered custom elements, conic gradients, blur, and responsive layout rules so the graphic can sit beside the filters on larger screens and move under the content on smaller screens.

## License

    Copyright [2026] [Shreya Pasupuleti]

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
