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
import { type TReferralsSchema } from '@hooks/useReferrals';
import { referralfStatusLabels } from '@lib/types';

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

interface EnquiryChartProps {
  data: TReferralsSchema | undefined;
  error: Error | undefined;
}

export default function EnquiryChart({ data, error }: EnquiryChartProps): React.JSX.Element {
  if (error) {
    return <div className='text-red-600'>Error loading enquiries: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div className='text-gray-600'>No data available</div>;
  }

  // Aggregate data by organisation and status
  const aggregatedData = data.reduce((acc, referral) => {
    const orgName = referral.org_name;
    const status = referral.status;
    
    if (!acc[orgName]) {
      acc[orgName] = {};
    }
    if (!acc[orgName][status]) {
      acc[orgName][status] = 0;
    }
    acc[orgName][status]++;
    
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const organisations = Object.keys(aggregatedData).sort();
  const statuses = Array.from(new Set(data.map(d => d.status))).sort();

  // Define colors for each status to match table pills
  const statusColors: Record<string, string> = {
    'new': '#bbf7d080', // green-200 with transparency to match bg-green-100
    'pending': '#bfdbfe80', // blue-200 with transparency to match bg-blue-100
    'onhold': '#fef3c780', // yellow-200 with transparency to match bg-yellow-100
    'closed-successful': '#f5d0fe80', // fuchsia-200 with transparency to match bg-fuchsia-100
    'closed-withdrew': '#fed7aa80', // orange-200 with transparency to match bg-orange-100
    'closed-unable': '#fecaca80', // red-200 with transparency to match bg-red-100
  };

  const chartData = {
    labels: organisations,
    datasets: statuses.map(status => ({
      label: referralfStatusLabels[status as keyof typeof referralfStatusLabels] || status,
      data: organisations.map(org => aggregatedData[org][status] || 0),
      backgroundColor: statusColors[status] || '#6b728080',
      borderRadius: 4,
    })),
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
          text: 'Organisation',
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Number of Enquiries',
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