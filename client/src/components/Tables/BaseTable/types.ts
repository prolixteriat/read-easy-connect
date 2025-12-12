import { type ColumnDef, type SortingState } from '@tanstack/react-table';

// -----------------------------------------------------------------------------

export interface BaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick: (row: T) => void;
  onCopy?: () => void;
  filterPlaceholder?: string;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  renderMobileCard: (item: T) => React.ReactNode;
  children?: React.ReactNode;
}

export interface TableFormProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: T | null;
  onSave: () => void;
  isSaving: boolean;
  children: React.ReactNode;
}

export interface TableState {
  sorting: SortingState;
  globalFilter: string;
  isOpen: boolean;
  showConfirm: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  showError: boolean;
  errorMessage: string;
  showCopied: boolean;
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
