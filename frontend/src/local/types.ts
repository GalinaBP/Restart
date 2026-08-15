export type FieldType =
  | 'STRING'
  | 'BOOLEAN'
  | 'INTEGER'
  | 'MONEY'
  | 'DATE'
  | 'PASSPORT_SERIES'
  | 'PASSPORT_NUMBER'
  | 'INN';

export interface FieldMeta {
  name: string;
  type: FieldType;
  required: boolean;
}

export interface SectionDefinition {
  key: string;
  order: number;
  repeatable: boolean;
  mandatory: boolean;
  uniqueBy: string[];
  fields: FieldMeta[];
}

export type SectionValue = string | number | boolean;

export type SectionEntry = Record<string, SectionValue>;

export type SectionPayload = SectionEntry | SectionEntry[];

export type ValidationCode =
  | 'SECTION_EMPTY'
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_TYPE'
  | 'INVALID_MONEY'
  | 'INVALID_DATE'
  | 'INVALID_PASSPORT_SERIES'
  | 'INVALID_PASSPORT_NUMBER'
  | 'INVALID_INN'
  | 'DUPLICATE_ENTRY';

export interface ValidationIssue {
  section: string;
  entryIndex: number | null;
  field: string | null;
  code: ValidationCode;
  message: string;
}

export type ProcedureBranch = 'RESTRUCTURING' | 'REALIZATION' | 'SETTLEMENT';

export interface StageDefinition {
  key: string;
  order: number;
  branch: ProcedureBranch | null;
  derived: boolean;
  statutoryBasis: string;
}

export type FeeItem = 'STATE_DUTY' | 'MANAGER_DEPOSIT';

export interface FeeLine {
  key: FeeItem;
  amount: string;
  confirmed: boolean;
  statutoryBasis: string;
}

export interface FeeSchedule {
  effectiveFrom: string;
  items: FeeLine[];
}
