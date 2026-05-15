import { useEffect, useState } from "react";
import type { ExplorerBlock, NetStat } from "../../data/types";
import { ExplorerRuntime, createInitialSnapshot } from "./runtime";
import { isForcedFixtureMode } from "./settings";
import type { ExplorerRuntimeSnapshot } from "./types";

let runtime: ExplorerRuntime | undefined;

export function getExplorerRuntime(): ExplorerRuntime {
  runtime ??= new ExplorerRuntime();
  return runtime;
}

export function resetExplorerRuntimeForTests(nextRuntime?: ExplorerRuntime): void {
  runtime = nextRuntime;
}

export function useExplorerSnapshot(initialBlocks?: ExplorerBlock[], initialStats?: NetStat[]): ExplorerRuntimeSnapshot {
  const [snapshot, setSnapshot] = useState(() => createInitialSnapshot(initialBlocks, initialStats));

  useEffect(() => {
    const explorer = getExplorerRuntime();
    const unsubscribe = explorer.subscribe(setSnapshot);
    void explorer.start({ forceFixture: isForcedFixtureMode() });

    return () => {
      void unsubscribe();
    };
  }, []);

  return snapshot;
}
