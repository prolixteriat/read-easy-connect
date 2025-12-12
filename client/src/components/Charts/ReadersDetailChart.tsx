import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// -----------------------------------------------------------------------------

interface ReadersDetailChartProps {
  filteredData?: Array<{
    area_id: number | null;
    area_name: string | null;
    coordinator_id: number | null;
    coordinator_name: string | null;
    reader_id: number | null;
    reader_name: string | null;
    reader_level: string | null;
    reader_status: string | null;
    reader_notes: string | null;
    TP1: number;
    TP2: number;
    TP3: number;
    TP4: number;
    TP5: number;
  }>;
}

export default function ReadersDetailChart({ filteredData }: ReadersDetailChartProps): React.JSX.Element {
  const displayData = filteredData || [];



  if (displayData.length === 0) {
    return <div className='text-gray-600'>No readers match the selected filters</div>;
  }

  // Use filtered data and group by area
  const validReaders = displayData;
  const areaData = validReaders.reduce((acc, reader) => {
    const areaName = reader.area_name || 'Unassigned';
    if (!acc[areaName]) {
      acc[areaName] = { total: 0, byStatus: {} };
    }
    acc[areaName].total++;
    const status = reader.reader_status || 'Unknown';
    acc[areaName].byStatus[status] = (acc[areaName].byStatus[status] || 0) + 1;
    return acc;
  }, {} as Record<string, { total: number; byStatus: Record<string, number> }>);

  // Sort areas to put 'Unassigned' at the end
  const areas = Object.keys(areaData).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });
  const allStatuses = [...new Set(validReaders.map(r => r.reader_status || 'Unknown'))];

  const chartData = {
    labels: areas,
    datasets: allStatuses.map((status, index) => ({
      label: status,
      data: areas.map(area => areaData[area].byStatus[status] || 0),
      backgroundColor: [
        '#3b82f680',
        '#f9731680', 
        '#10b98180',
        '#facc1580',
        '#8b5cf680',
        '#ef444480',
        '#06b6d480',
        '#84cc1680'
      ][index % 8],
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 0,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Areas',
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Number of Readers',
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className='h-96 w-full max-w-full min-w-0'>
      <Bar data={chartData} options={options} />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------