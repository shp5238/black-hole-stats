import { useReducer } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Dashboard } from './components/Dashboard.jsx';
import { DetailView } from './components/DetailView.jsx';
import { useBlackHoles } from './hooks/useBlackHoles.js';
import { filterReducer, initialFilterState } from './state/filterReducer.js';

export function App() {
  const { blackHoles, loading, error } = useBlackHoles();
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main className="app-shell" id="main-content" tabIndex="-1">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                blackHoles={blackHoles}
                loading={loading}
                error={error}
                filters={filters}
                dispatch={dispatch}
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
                dispatch={dispatch}
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
