import { createContext, useContext, useReducer, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { id: action.id, variant: action.variant, message: action.message, duration: action.duration, action: action.action },
        ].slice(-3),
      };
    case "REMOVE":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
};

let idCounter = 0;
const nextId = () => `toast-${++idCounter}`;

export function ToastProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { toasts: [] });

  const toast = useCallback(
    ({ variant = "info", message, duration = 5000, action }) => {
      const id = nextId();
      dispatch({ type: "ADD", id, variant, message, duration, action });
      return id;
    },
    []
  );

  const dismiss = useCallback((id) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const value = { toasts: state.toasts, toast, dismiss };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toasts: [], toast: () => {}, dismiss: () => {} };
  return ctx;
}

export default ToastContext;
