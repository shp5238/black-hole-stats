export const FILTER_ACTIONS = {
  SET_QUERY: 'set-query',
  SET_TYPE_FILTER: 'set-type-filter',
  SET_MIN_MASS: 'set-min-mass',
  SET_MASS_STOP: 'set-mass-stop',
  RESET: 'reset',
};

export const initialFilterState = {
  query: '',
  typeFilter: 'All',
  minMass: 0,
  massStep: 0,
};

export function filterReducer(state, action) {
  switch (action.type) {
    case FILTER_ACTIONS.SET_QUERY:
      return { ...state, query: action.value };
    case FILTER_ACTIONS.SET_TYPE_FILTER:
      return { ...state, typeFilter: action.value };
    case FILTER_ACTIONS.SET_MIN_MASS:
      return { ...state, minMass: action.value, massStep: 0 };
    case FILTER_ACTIONS.SET_MASS_STOP:
      return {
        ...state,
        minMass: action.minMass,
        massStep: action.massStep,
      };
    case FILTER_ACTIONS.RESET:
      return initialFilterState;
    default:
      return state;
  }
}
