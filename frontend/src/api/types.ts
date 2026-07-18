/** Stable error payload returned by the backend's GlobalExceptionHandler for every non-2xx response. */
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
  fieldErrors?: { field: string; message: string }[];
  /** Present on 409 GENERATION_BLOCKED: what to fix, addressed to the workflow step. */
  missing?: MissingItem[];
}

/** One item of the missing-information contract (AI-007). */
export interface MissingItem {
  step: string;
  entryIndex: number | null;
  field: string | null;
  code: string;
  message: string;
}
