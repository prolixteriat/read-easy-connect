import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getReadersUrl = (): string => 
    { return `${apiBaseUrl}/readers/get-readers`; }
const getReaderUrl = (readerId: number): string => 
    { return `${apiBaseUrl}/readers/get-reader?reader_id=${readerId}`; }

const readersFetcher = (data: string[]) => fetcherAuth(data, ReadersSchemaArray);
const readerFetcher = (data: string[]) => fetcherAuth(data, ReadersSchema);

// -----------------------------------------------------------------------------

const ReadersSchema = z.object({
    reader_id: z.number(),
    name: z.string(),
    affiliate_id: z.number(),
    area_id: z.number().nullable(),
    area_name: z.string().nullable(),
    coach_id: z.number().nullable(),
    coach_first_name: z.string().nullable(),
    coach_last_name: z.string().nullable(),
    referrer_name: z.string().nullable(),
    referrer_org: z.string().nullable(),
    created_at: z.string(),
    level: z.string(),
    status: z.string(),
    availability: z.string().nullable(),
    notes: z.string().nullable(),
    enrolment_at: z.string().nullable(),
    coaching_start_at: z.string().nullable(),
    graduation_at: z.string().nullable(),
    TP1_start_at: z.string().nullable(),
    TP2_start_at: z.string().nullable(),
    TP3_start_at: z.string().nullable(),
    TP4_start_at: z.string().nullable(),
    TP5_start_at: z.string().nullable(),
    TP1_completion_at: z.string().nullable(),
    TP2_completion_at: z.string().nullable(),
    TP3_completion_at: z.string().nullable(),
    TP4_completion_at: z.string().nullable(),
    TP5_completion_at: z.string().nullable(),
    ons4_1: z.number(),
    ons4_2: z.number(),
    ons4_3: z.number(),
});

const ReadersSchemaArray = z.array(ReadersSchema);

export type TReaderSchema = z.TypeOf<typeof ReadersSchema>;
export type TReadersSchema = z.TypeOf<typeof ReadersSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseReaders {
    data: TReadersSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReadersSchema> | undefined;
}   

export function useReaders(): IuseReaders {
    
    const searchUrl = getReadersUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        readersFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseReaders = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseReader {
    data: TReaderSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReaderSchema> | undefined;
}

export function useReader(readerId: number): IuseReader {
    const searchUrl = getReaderUrl(readerId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        readerFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseReader = { 
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
