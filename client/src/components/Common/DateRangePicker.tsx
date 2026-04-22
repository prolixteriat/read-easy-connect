import React, { useEffect, useState, useCallback } from 'react';

import HoverHelp from './HoverHelp';

// -----------------------------------------------------------------------------

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps): React.JSX.Element {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Update local state when props change
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // Update function for blur events, Enter key, and buttons
  const triggerUpdate = useCallback(() => {
    onDateChange(localStartDate, localEndDate);
  }, [localStartDate, localEndDate, onDateChange]);

  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      setLocalStartDate(startDateStr);
      setLocalEndDate(endDateStr);
      onDateChange(startDateStr, endDateStr);
    }
  }, [startDate, endDate, onDateChange]);

  const handlePreviousMonth = () => {
    const currentStart = new Date(localStartDate);
    const targetYear = currentStart.getFullYear();
    const targetMonth = currentStart.getMonth() - 1;
    
    const finalYear = targetYear + Math.floor(targetMonth / 12);
    const finalMonth = ((targetMonth % 12) + 12) % 12;
    
    const startDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(finalYear, finalMonth + 1, 0).getDate();
    const endDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    setLocalStartDate(startDateStr);
    setLocalEndDate(endDateStr);
    // Remove automatic update - only Update button should trigger data refresh
  };

  const handleNextMonth = () => {
    const currentStart = new Date(localStartDate);
    const targetYear = currentStart.getFullYear();
    const targetMonth = currentStart.getMonth() + 1;
    
    const finalYear = targetYear + Math.floor(targetMonth / 12);
    const finalMonth = targetMonth % 12;
    
    const startDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(finalYear, finalMonth + 1, 0).getDate();
    const endDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    setLocalStartDate(startDateStr);
    setLocalEndDate(endDateStr);
    // Remove automatic update - only Update button should trigger data refresh
  };

  const handleStartDateChange = (value: string) => {
    setLocalStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setLocalEndDate(value);
  };

  const handleKeyDown = () => {
    // Remove Enter key trigger - only Update button should trigger updates
  };

  const handleUpdateClick = () => {
    triggerUpdate();
  };

  return (
    <div className="border border-gray-300 rounded-lg p-1 md:p-4 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-2">
          <div>
            <label htmlFor='date-range-start' className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id='date-range-start'
              name='startDate'
              type="date"
              value={localStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete='off'
            />
          </div>
          <div>
            <label htmlFor='date-range-end' className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id='date-range-end'
              name='endDate'
              type="date"
              value={localEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete='off'
            />
          </div>
        </div>
        <div className="flex gap-2 md:mt-6">
          <button
            onClick={handlePreviousMonth}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
          >
            -1 Month
          </button>
          <button
            onClick={handleNextMonth}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
          >
            +1 Month
          </button>
          <button
            onClick={handleUpdateClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          >
            Update
          </button>
          <HoverHelp text="Select values for the Start Date and End Date and then press the Update button" />
        </div>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
