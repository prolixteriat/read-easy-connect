import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getAuditLogsUrl = (type?: string, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/reports/get-audit-logs`;
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return params.toString() ? `${url}?${params.toString()}` : url;
}

const getCoachDetailUrl = (): string => {
    return `${apiBaseUrl}/reports/get-coach-detail`;
}

const getReaderDetailUrl = (): string => {
    return `${apiBaseUrl}/reports/get-reader-detail`;
}

const getDashboardUrl = (): string => {
    return `${apiBaseUrl}/reports/get-dashboard`;
}

const auditLogsFetcher = (data: string[]) => fetcherAuth(data, AuditLogsSchemaArray);
const coachDetailFetcher = (data: string[]) => fetcherAuth(data, CoachDetailSchemaArray);
const readerDetailFetcher = (data: string[]) => fetcherAuth(data, ReaderDetailSchemaArray);
const dashboardFetcher = (data: string[]) => fetcherAuth(data, DashboardSchema);

// -----------------------------------------------------------------------------

const AuditLogsSchema = z.object({
    audit_id: z.number(),
    affiliate_id: z.number(),
    performed_by_id: z.number(),
    performed_on_id: z.number().nullable(),
    type: z.string(),
    description: z.string(),
    created_at: z.string(),
    performed_by_first_name: z.string(),
    performed_by_last_name: z.string(),
    performed_on_first_name: z.string().nullable(),
    performed_on_last_name: z.string().nullable(),
    affiliate_name: z.string(),
});

const CoachDetailSchema = z.union([
    z.object({
        user_id: z.number().optional(),
        coordinator_name: z.string(),
        paired: z.union([z.string(), z.number()]),
        waiting_pairing: z.union([z.string(), z.number()]),
        waiting_training: z.union([z.string(), z.number()]),
        waiting_checks: z.union([z.string(), z.number()]),
        on_break: z.union([z.string(), z.number()]),
        total: z.number(),
    }),
    z.object({
        coordinator_name: z.literal('TOTAL_COLUMNS'),
    }).catchall(z.number())
]);

const ReaderDetailSchema = z.object({
    area_id: z.number().nullable(),
    area_name: z.string().nullable(),
    coordinator_id: z.number().nullable(),
    coordinator_name: z.string().nullable(),
    reader_id: z.number().nullable(),
    reader_name: z.string().nullable(),
    reader_level: z.string().nullable(),
    reader_status: z.string().nullable(),
    reader_notes: z.string().nullable(),
    TP1: z.number(),
    TP2: z.number(),
    TP3: z.number(),
    TP4: z.number(),
    TP5: z.number(),
});

const DashboardSchema = z.object({
    affiliate: z.string(),
    manager: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    viewer: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    coordinator: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    coach: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    reader_TP1: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    reader_TP2: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    reader_TP3: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    reader_TP4: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
    reader_TP5: z.object({
        active: z.number(),
        onhold: z.number(),
        total: z.number(),
    }),
});

const AuditLogsSchemaArray = z.array(AuditLogsSchema);
const CoachDetailSchemaArray = z.array(CoachDetailSchema);
const ReaderDetailSchemaArray = z.array(ReaderDetailSchema);

export type TAuditLogsSchema = z.TypeOf<typeof AuditLogsSchemaArray>;
export type TCoachDetailSchema = z.TypeOf<typeof CoachDetailSchemaArray>;
export type TReaderDetailSchema = z.TypeOf<typeof ReaderDetailSchemaArray>;
export type TDashboardSchema = z.TypeOf<typeof DashboardSchema>;

// -----------------------------------------------------------------------------

export interface IuseAuditLogs {
    data: TAuditLogsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TAuditLogsSchema> | undefined;
}   

export function useAuditLogs(type?: string, startDate?: string, endDate?: string): IuseAuditLogs {
    
    const searchUrl = getAuditLogsUrl(type, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        auditLogsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseAuditLogs = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseCoachDetail {
    data: TCoachDetailSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TCoachDetailSchema> | undefined;
}

export function useCoachDetail(): IuseCoachDetail {
    const searchUrl = getCoachDetailUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        coachDetailFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseCoachDetail = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseReaderDetail {
    data: TReaderDetailSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReaderDetailSchema> | undefined;
}

export function useReaderDetail(): IuseReaderDetail {
    const searchUrl = getReaderDetailUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        readerDetailFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseReaderDetail = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------

export interface IuseDashboard {
    data: TDashboardSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TDashboardSchema> | undefined;
}

export function useDashboard(): IuseDashboard {
    const searchUrl = getDashboardUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        dashboardFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseDashboard = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
