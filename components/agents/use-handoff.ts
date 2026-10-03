"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { readHandoff, type HandoffSpec } from "@/lib/handoff";

// Values passed in from another agent. `spec` must be a module-level constant.
export function useHandoff(spec: HandoffSpec): Record<string, string> {
  const params = useSearchParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readHandoff(params, spec), [params]);
}
