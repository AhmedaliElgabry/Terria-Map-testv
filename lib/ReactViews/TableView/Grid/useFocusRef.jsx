import {
  useRef,
  useEffect,
  useLayoutEffect as useOriginalLayoutEffect
} from "react";

const useLayoutEffect =
  typeof window === "undefined" ? useEffect : useOriginalLayoutEffect;

export function useFocusRef(isSelected) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!isSelected) return;
    ref.current?.focus({ preventScroll: true });
  }, [isSelected]);

  return {
    ref,
    tabIndex: isSelected ? 0 : -1
  };
}
