import { useCallback, useEffect, useRef, useState } from 'react';

type ScopedAsyncResourceState<T> = {
  scope: string | null;
  value: T;
  loading: boolean;
  error: string | null;
};

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Owns an async resource whose value belongs to one selected entity.
 * Only the latest request for the current scope may publish state or return a value.
 */
export function useScopedAsyncResource<T>(options: {
  scope: string | null;
  initialValue: T;
  load: (scope: string) => Promise<T>;
  fallbackError: string;
}) {
  const { scope, initialValue, load, fallbackError } = options;
  const initialValueRef = useRef(initialValue);
  const [state, setState] = useState<ScopedAsyncResourceState<T>>({
    scope: null,
    value: initialValue,
    loading: false,
    error: null,
  });
  const currentScopeRef = useRef(scope);
  const requestSequenceRef = useRef(0);
  currentScopeRef.current = scope;

  const refresh = useCallback(async (): Promise<T | null> => {
    if (!scope) return null;
    const requestScope = scope;
    const requestSequence = ++requestSequenceRef.current;
    setState((current) => ({
      scope: requestScope,
      value: current.scope === requestScope ? current.value : initialValueRef.current,
      loading: true,
      error: null,
    }));

    try {
      const value = await load(requestScope);
      if (
        currentScopeRef.current !== requestScope
        || requestSequenceRef.current !== requestSequence
      ) return null;
      setState({ scope: requestScope, value, loading: false, error: null });
      return value;
    } catch (error) {
      if (
        currentScopeRef.current !== requestScope
        || requestSequenceRef.current !== requestSequence
      ) return null;
      setState((current) => ({
        scope: requestScope,
        value: current.scope === requestScope ? current.value : initialValueRef.current,
        loading: false,
        error: toErrorMessage(error, fallbackError),
      }));
      return null;
    }
  }, [fallbackError, load, scope]);

  useEffect(() => {
    if (!scope) {
      requestSequenceRef.current += 1;
      setState({ scope: null, value: initialValueRef.current, loading: false, error: null });
      return;
    }
    void refresh();
  }, [refresh, scope]);

  useEffect(() => () => {
    requestSequenceRef.current += 1;
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((current) => {
      const currentScope = currentScopeRef.current;
      if (!currentScope) return current;
      return current.scope === currentScope
        ? { ...current, error }
        : { scope: currentScope, value: initialValueRef.current, loading: false, error };
    });
  }, []);

  const ownsCurrentScope = state.scope === scope;
  return {
    value: ownsCurrentScope ? state.value : initialValueRef.current,
    loading: scope ? (ownsCurrentScope ? state.loading : true) : false,
    error: ownsCurrentScope ? state.error : null,
    refresh,
    setError,
  };
}
