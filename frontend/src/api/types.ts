export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
  fieldErrors?: { field: string; message: string }[];
  missing?: MissingItem[];
}

export interface MissingItem {
  step: string;
  entryIndex: number | null;
  field: string | null;
  code: string;
  message: string;
}
