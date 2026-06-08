"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface ItineraryStop {
  dayNumber: number;
  nights: number;
  lodgeId: string;
  lodgeName: string;
  lodgeVillage: string;
  lodgeAltitude: number | null;
  roomId: string;
  roomName: string;
  roomType: string;
  pricePerNight: number;
}

interface TravelerInfo {
  name: string;
  email: string;
  groupSize: number;
  specialRequests: string;
}

interface ItineraryState {
  trekRoute: string;
  trekRouteName: string;
  startDate: string;
  itineraryName: string;
  templateId: string | null;
  stops: ItineraryStop[];
  traveler: TravelerInfo;
}

interface ItineraryContextValue extends ItineraryState {
  setStartDate: (date: string) => void;
  setItineraryName: (name: string) => void;
  setTemplateId: (id: string | null) => void;
  setStops: (stops: ItineraryStop[]) => void;
  updateStop: (index: number, stop: Partial<ItineraryStop>) => void;
  setTraveler: (info: Partial<TravelerInfo>) => void;
  reset: () => void;
  grandTotal: number;
  quotedTotals: number[];
  isQuoting: boolean;
  legTotal: (i: number) => number;
}

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

const STORAGE_KEY = "hs-itinerary-builder";

function makeInitialState(trekRoute: string, trekRouteName: string): ItineraryState {
  return {
    trekRoute,
    trekRouteName,
    startDate: "",
    itineraryName: "",
    templateId: null,
    stops: [],
    traveler: { name: "", email: "", groupSize: 1, specialRequests: "" },
  };
}

export function ItineraryBuilderProvider({
  trekRoute,
  trekRouteName,
  children,
}: {
  trekRoute: string;
  trekRouteName: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<ItineraryState>(() => {
    if (typeof window === "undefined") return makeInitialState(trekRoute, trekRouteName);
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ItineraryState;
        if (parsed.trekRoute === trekRoute) return parsed;
      }
    } catch {}
    return makeInitialState(trekRoute, trekRouteName);
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const [quotedTotals, setQuotedTotals] = useState<number[]>([]);
  const [isQuoting, setIsQuoting] = useState(false);

  const quoteSignature = state.startDate
    ? state.stops.map((s) => `${s.roomId}:${s.dayNumber}:${s.nights}`).join("|")
    : "";

  useEffect(() => {
    const allRoomsPicked =
      state.stops.length > 0 && state.stops.every((s) => s.roomId);
    if (!state.startDate || !allRoomsPicked) {
      setQuotedTotals([]);
      return;
    }
    let cancelled = false;
    setIsQuoting(true);
    fetch("/api/pricing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: state.startDate,
        stops: state.stops.map((s) => ({
          roomId: s.roomId,
          dayNumber: s.dayNumber,
          nights: s.nights,
        })),
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { totals: number[] }) => {
        if (!cancelled) setQuotedTotals(data.totals);
      })
      .catch(() => {
        if (!cancelled) setQuotedTotals([]);
      })
      .finally(() => {
        if (!cancelled) setIsQuoting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteSignature]);

  const setStartDate = useCallback((date: string) => {
    setState((s) => ({ ...s, startDate: date }));
  }, []);

  const setItineraryName = useCallback((name: string) => {
    setState((s) => ({ ...s, itineraryName: name }));
  }, []);

  const setTemplateId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, templateId: id }));
  }, []);

  const setStops = useCallback((stops: ItineraryStop[]) => {
    setState((s) => ({ ...s, stops }));
  }, []);

  const updateStop = useCallback((index: number, partial: Partial<ItineraryStop>) => {
    setState((s) => {
      const stops = [...s.stops];
      stops[index] = { ...stops[index], ...partial };
      return { ...s, stops };
    });
  }, []);

  const setTraveler = useCallback((info: Partial<TravelerInfo>) => {
    setState((s) => ({ ...s, traveler: { ...s.traveler, ...info } }));
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState(makeInitialState(trekRoute, trekRouteName));
  }, [trekRoute, trekRouteName]);

  const legTotal = useCallback(
    (i: number) => {
      const stop = state.stops[i];
      if (!stop) return 0;
      const quoted = quotedTotals[i];
      if (typeof quoted === "number" && quoted > 0) return quoted;
      return stop.pricePerNight * stop.nights;
    },
    [state.stops, quotedTotals]
  );

  const grandTotal =
    quotedTotals.length === state.stops.length && state.stops.length > 0
      ? quotedTotals.reduce((sum, t) => sum + t, 0)
      : state.stops.reduce(
          (sum, stop) => sum + stop.pricePerNight * stop.nights,
          0
        );

  return (
    <ItineraryContext.Provider
      value={{
        ...state,
        setStartDate,
        setItineraryName,
        setTemplateId,
        setStops,
        updateStop,
        setTraveler,
        grandTotal,
        quotedTotals,
        isQuoting,
        legTotal,
        reset,
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItineraryBuilder() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error("useItineraryBuilder must be used within ItineraryBuilderProvider");
  return ctx;
}
