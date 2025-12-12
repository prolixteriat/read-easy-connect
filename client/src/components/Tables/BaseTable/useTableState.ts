import { useState } from 'react';
import { type SortingState } from '@tanstack/react-table';
import { type TableState } from './types';

// -----------------------------------------------------------------------------

export function useTableState(defaultSort: { id: string; desc: boolean }): TableState & {
  setSorting: (sorting: SortingState) => void;
  setGlobalFilter: (filter: string) => void;
  setIsOpen: (open: boolean) => void;
  setShowConfirm: (show: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setErrors: (errors: Record<string, string>) => void;
  setShowError: (show: boolean) => void;
  setErrorMessage: (message: string) => void;
  setShowCopied: (show: boolean) => void;
} {
  const [sorting, setSorting] = useState<SortingState>([defaultSort]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  return {
    sorting,
    globalFilter,
    isOpen,
    showConfirm,
    isSaving,
    errors,
    showError,
    errorMessage,
    showCopied,
    setSorting,
    setGlobalFilter,
    setIsOpen,
    setShowConfirm,
    setIsSaving,
    setErrors,
    setShowError,
    setErrorMessage,
    setShowCopied,
  };
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
