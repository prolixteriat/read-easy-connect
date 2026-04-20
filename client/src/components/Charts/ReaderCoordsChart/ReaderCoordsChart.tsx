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

interface ReaderCoordsChartProps {
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

export default function ReaderCoordsChart({ filteredData }: ReaderCoordsChartProps): React.JSX.Element {
  const displayData = filteredData || [];

  if (displayData.length === 0) {
    return <div className='text-gray-600'>No readers match the selected filters</div>;
  }

  // Group by coordinator
  const coordData = displayData.reduce((acc, reader) => {
    const coordName = reader.coordinator_name || 'Unassigned';
    if (!acc[coordName]) {
      acc[coordName] = { total: 0, byStatus: {} };
    }
    acc[coordName].total++;
    const status = reader.reader_status || 'Unknown';
    acc[coordName].byStatus[status] = (acc[coordName].byStatus[status] || 0) + 1;
    return acc;
  }, {} as Record<string, { total: number; byStatus: Record<string, number> }>);

  // Sort coordinators to put 'Unassigned' at the end
  const coordinators = Object.keys(coordData).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });
  const allStatuses = [...new Set(displayData.map(r => r.reader_status || 'Unknown'))];

  const chartData = {
    labels: coordinators,
    datasets: allStatuses.map((status, index) => ({
      label: status,
      data: coordinators.map(coord => coordData[coord].byStatus[status] || 0),
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
          text: 'Coordinators',
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