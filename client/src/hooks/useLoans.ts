import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getLoansUrl = (readerId?: number, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/loans/get-loans`;
    const params = new URLSearchParams();
    if (readerId) params.append('reader_id', readerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return params.toString() ? `${url}?${params.toString()}` : url;
}

const getLoanUrl = (loanId: number): string => 
    { return `${apiBaseUrl}/loans/get-loan?loan_id=${loanId}`; }

const loansFetcher = (data: string[]) => fetcherAuth(data, LoansSchemaArray);
const loanFetcher = (data: string[]) => fetcherAuth(data, LoansSchema);

// -----------------------------------------------------------------------------

const LoansSchema = z.object({
    loan_id: z.number(),
    reader_id: z.number(),
    item: z.string(),
    loan_date: z.string(),
    return_date: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    reader_name: z.string(),
});

const LoansSchemaArray = z.array(LoansSchema);

export type TLoanSchema = z.TypeOf<typeof LoansSchema>;
export type TLoansSchema = z.TypeOf<typeof LoansSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseLoans {
    data: TLoansSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TLoansSchema> | undefined;
}   

export function useLoans(readerId?: number, startDate?: string, endDate?: string): IuseLoans {
    
    const searchUrl = getLoansUrl(readerId, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        loansFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseLoans = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseLoan {
    data: TLoanSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TLoanSchema> | undefined;
}

export function useLoan(loanId: number): IuseLoan {
    const searchUrl = getLoanUrl(loanId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        loanFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseLoan = { 
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
