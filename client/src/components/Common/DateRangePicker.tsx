import React, { useEffect } from 'react';

// -----------------------------------------------------------------------------

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps): React.JSX.Element {
  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      onDateChange(startDateStr, endDateStr);
    }
  }, [startDate, endDate, onDateChange]);

  const handlePreviousMonth = () => {
    const currentStart = new Date(startDate);
    const targetYear = currentStart.getFullYear();
    const targetMonth = currentStart.getMonth() - 1;
    
    const finalYear = targetYear + Math.floor(targetMonth / 12);
    const finalMonth = ((targetMonth % 12) + 12) % 12;
    
    const startDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(finalYear, finalMonth + 1, 0).getDate();
    const endDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    onDateChange(startDateStr, endDateStr);
  };

  const handleNextMonth = () => {
    const currentStart = new Date(startDate);
    const targetYear = currentStart.getFullYear();
    const targetMonth = currentStart.getMonth() + 1;
    
    const finalYear = targetYear + Math.floor(targetMonth / 12);
    const finalMonth = targetMonth % 12;
    
    const startDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(finalYear, finalMonth + 1, 0).getDate();
    const endDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    onDateChange(startDateStr, endDateStr);
  };

  const handleStartDateChange = (value: string) => {
    onDateChange(value, endDate);
  };

  const handleEndDateChange = (value: string) => {
    onDateChange(startDate, value);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-1 md:p-4 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
