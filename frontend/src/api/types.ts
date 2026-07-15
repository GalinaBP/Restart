/** Stable error payload returned by the backend's GlobalExceptionHandler for every non-2xx response. */
export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
  fieldErrors?: { field: string; message: string }[];
}
