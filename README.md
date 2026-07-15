# Web Development Projects 5 + 6 - *Black Hole Stats*

Submitted by: **Shreya Pasupuleti**

This web app: **A React + Vite data dashboard that fetches black hole catalog data, shows summary statistics, and lets users search and filter the list.**

Time spent: **7** hours spent in total; Project 5
Time spent: **15** hours spent in total; Project 5+6

## Required Features: Project 5

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
- [X] The user can enter specific bounds for filter values
  - A numeric minimum-mass input stays synchronized with the mass slider

The following **additional** features are implemented:

* [X] Custom CSS black hole graphic with glowing swirl elements
* [X] Wikidata fallback data so the dashboard still works if the live API is unavailable
* [X] Deduping and type normalization for live Wikidata results
* [X] Snapping mass slider that jumps between real catalog mass values for better usability
* [X] Automated tests for loading, searching, filtering, combined filters, slider behavior, and duplicate live API rows

## Video Walkthrough: Project 5

Here's a walkthrough of implemented user stories:

[View the Project 5 walkthrough on Loom](https://www.loom.com/share/f246d7f300694d849175d1331745b447)

GIF created with Loom.

__

## Required Features: Project 6

The following **required** functionality is completed:

- [X] **Clicking on an item in the list view displays more details about it**
  - Clicking on an item in the dashboard list navigates to a detail view for that item
  - Detail view includes its constellation, estimated event-horizon radius, mass rank, and previous/next catalog navigation
  - The same sidebar is displayed in detail view as in dashboard view
  - *To ensure an accurate grade, your sidebar **must** be viewable when showing the details view in your recording.*
- [X] **Each detail view of an item has a direct, unique URL link to that item’s detail view page**
  - React Router generates routes in the format `/black-holes/:blackHoleId`
  - `Link` creates each catalog link and `useParams()` loads the matching object in the detail view
  -  *To ensure an accurate grade, the URL/address bar of your web browser **must** be viewable in your recording.*
- [X] **The app includes at least two unique charts developed using the fetched data that tell an interesting story**
  - The Catalog Mix bar chart compares the number of stellar, intermediate, and supermassive black holes
  - The Mass vs Distance scatter plot compares object mass with distance from Earth
  - Both Recharts visualizations are displayed together in the dashboard view


The following **optional** features are implemented:

- [X] The site’s customized dashboard contains more content that explains what is interesting about the data
  - e.g., an additional description, graph annotation, suggestion for which filters to use, or an additional page that explains more about the data
- [X] The site allows users to toggle between different data visualizations
  - The Mass vs Distance plot can be switched between logarithmic and linear scales while both required charts remain visible


The following **additional** features are implemented:

* [X] Responsive animated black-hole hero built with layered CSS gradients and swirl effects; no javascript used
* [X] Sortable table columns for name, type, mass, and distance, with ascending, descending, and off states
* [X] Search, type, and minimum-mass filters that can be combined and reset
* [X] Pagination for larger result sets
* [X] Accessible chart summaries and a persistent type-color legend
* [X] Motion on/off control for the animated black-hole graphic, including reduced-motion support
* [X] Keyboard focus states, live empty-state announcements, and accessible sorting semantics
* [X] Filter-aware previous/next links and automatic positioning between the table and detail views
* [X] Cached local catalog fallback with a dismissible status notice when Wikidata is unavailable
* [X] Responsive layouts for laptop, tablet, and mobile screens
* [X] Validated Wikidata responses, sanitized external source links, and normalized malformed numeric fields
* [X] Abortable live API requests with a timeout, unmount cleanup, and a stable failure state when both data sources fail
* [X] Exact dependency versions and a production dependency audit with no known vulnerabilities
* [X] Expanded 22-test suite covering API failures, malformed data, unsafe URLs, routing, accessibility, sorting, filtering, pagination, charts, and boundary values

## Video Walkthrough: Project 6

Here's a walkthrough of implemented user stories:

[View the Project 6 walkthrough on Loom](https://www.loom.com/share/f4ecac4ea10e4067a40f6cbfa58d5074)

<div style="position: relative; padding-bottom: 48.75%; height: 0;">
  <iframe src="https://www.loom.com/embed/f4ecac4ea10e4067a40f6cbfa58d5074" title="Black Hole Stats Project 6 video walkthrough" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
</div>

GIF created with Loom.

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

## Notes from Project 5

The biggest challenge was making live Wikidata data reliable enough for a clean dashboard. Some rows came back with duplicate black hole names, very generic types, missing fields, or raw `Q` identifiers instead of readable labels. I handled this by deduping rows by object name, preferring the most specific type available, inferring a type from mass when needed, and falling back to a local JSON catalog if the live request fails or returns too few usable rows.

Another challenge was making the mass filter usable. Black hole masses vary from single digits to tens of billions of solar masses, so a normal linear slider would make most smaller objects impossible to select precisely. I changed the slider to snap through the actual mass values in the current catalog, which makes filtering predictable while still keeping the UI simple.

Styling the custom black hole graphic was also tricky because it needed to look dramatic without blocking the dashboard controls or table. I used layered custom elements, conic gradients, blur, and responsive layout rules so the graphic can sit beside the filters on larger screens and move under the content on smaller screens.

## Notes from Project 6

The first major challenge was adding detail pages without losing the context of the dashboard. React Router provides a unique route for every catalog object, while route state preserves the currently filtered and sorted object order for Previous and Next navigation. Catalog links jump directly to the detail content, and the Back to dashboard link returns the user to the table.

The second challenge was meeting the chart requirement without making the visualizations misleading. The Catalog Mix bar chart shows classification counts, while the Mass vs Distance scatter plot describes a different relationship in the data. Because black-hole masses and distances span many orders of magnitude, the scatter plot includes logarithmic and linear scale controls. Both charts remain visible at the same time to satisfy the base requirement.

Accessibility and clarity also required several iterations. The charts include screen-reader summaries, table sorting exposes direction through icons and `aria-sort`, the animated hero has a motion control, and the interface explains that `M☉` means solar masses. The detail cards and dashboard panels use high-contrast text and tested color combinations.

The data-loading code also needed defensive handling because remote API responses cannot be assumed to be complete or safe. The app now validates the Wikidata response shape, rejects non-finite, negative, and unsafe numeric values, and only allows external source links that resolve to Wikidata. Live requests are abortable and time out after ten seconds, state updates are prevented after unmounting, and a clear error is shown if both the live request and cached fallback fail.

Testing was expanded from the main dashboard interactions to 22 automated cases. The suite now anticipates malformed API payloads, total network failure, unsafe source URLs, invalid numeric data, direct and missing detail routes, filter boundaries, sort cycles, pagination, chart accessibility descriptions, motion preferences, empty states, and table-to-detail scroll positioning. The production build passes, and the production dependency audit reports no known vulnerabilities.


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
