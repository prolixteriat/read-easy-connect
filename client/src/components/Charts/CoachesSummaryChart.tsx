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
import { useCoachesSummary } from '@hooks/useReports';
import { Loading } from '@components/Common';

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

export default function CoachesSummaryChart(): React.JSX.Element {
  const { data, isLoading, error } = useCoachesSummary();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className='text-red-600'>Error loading coaches summary: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div className='text-gray-600'>No data available</div>;
  }

  const filteredData = data.filter(coordinator => 
    coordinator.coordinator_name !== 'TOTAL_ROWS' && 
    coordinator.coordinator_name !== 'TOTAL_COLUMNS'
  );

  const chartData = {
    labels: filteredData.map(coordinator => coordinator.coordinator_name),
    datasets: [
      {
        label: 'Paired',
        data: filteredData.map(coordinator => Number(coordinator.paired) || 0),
        backgroundColor: '#3b82f680',
        borderRadius: 4,
      },
      {
        label: 'Waiting Pairing',
        data: filteredData.map(coordinator => Number(coordinator.waiting_pairing) || 0),
        backgroundColor: '#f9731680',
        borderRadius: 4,
      },
      {
        label: 'Waiting Training',
        data: filteredData.map(coordinator => Number(coordinator.waiting_training) || 0),
        backgroundColor: '#10b98180',
        borderRadius: 4,
      },
      {
        label: 'Waiting Checks',
        data: filteredData.map(coordinator => Number(coordinator.waiting_checks) || 0),
        backgroundColor: '#facc1580',
        borderRadius: 4,
      },
      {
        label: 'On Break',
        data: filteredData.map(coordinator => Number(coordinator.on_break) || 0),
        backgroundColor: '#8b5cf680',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          text: 'Number of Coaches',
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
      },
    },
  };

  return (
    <div className='h-96 w-full'>
      <Bar data={chartData} options={options} />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------