import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getLessonsUrl = (startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/lessons/get-lessons`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return params.toString() ? `${url}?${params.toString()}` : url;
}

const getLessonsCoachUrl = (coachId: number, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/lessons/get-lessons-coach`;
    const params = new URLSearchParams();
    params.append('coach_id', coachId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `${url}?${params.toString()}`;
}

const getLessonsReaderUrl = (readerId: number, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/lessons/get-lessons-reader`;
    const params = new URLSearchParams();
    params.append('reader_id', readerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `${url}?${params.toString()}`;
}

const lessonsFetcher = (data: string[]) => fetcherAuth(data, LessonsSchemaArray);
const lessonsCoachFetcher = (data: string[]) => fetcherAuth(data, LessonsCoachSchemaArray);
const lessonsReaderFetcher = (data: string[]) => fetcherAuth(data, LessonsReaderSchemaArray);

// -----------------------------------------------------------------------------

const LessonsSchema = z.object({
    lesson_id: z.number(),
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue: z.string(),
    status: z.string(),
    attention: z.number(),
    notes: z.string().nullable(),
    created_at: z.string(),
    reader_name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
});

const LessonsCoachSchema = z.object({
    lesson_id: z.number(),
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue: z.string(),
    status: z.string(),
    attention: z.number(),
    notes: z.string().nullable(),
    created_at: z.string(),
    reader_name: z.string(),
});

const LessonsReaderSchema = z.object({
    lesson_id: z.number(),
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue: z.string(),
    status: z.string(),
    attention: z.number(),
    notes: z.string().nullable(),
    created_at: z.string(),
    first_name: z.string(),
    last_name: z.string(),
});

const LessonsSchemaArray = z.array(LessonsSchema);
const LessonsCoachSchemaArray = z.array(LessonsCoachSchema);
const LessonsReaderSchemaArray = z.array(LessonsReaderSchema);

export type TLessonsSchema = z.TypeOf<typeof LessonsSchemaArray>;
export type TLessonsCoachSchema = z.TypeOf<typeof LessonsCoachSchemaArray>;
export type TLessonsReaderSchema = z.TypeOf<typeof LessonsReaderSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseLessons {
    data: TLessonsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TLessonsSchema> | undefined;
}   

export function useLessons(startDate?: string, endDate?: string): IuseLessons {
    
    const searchUrl = getLessonsUrl(startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        lessonsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseLessons = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseLessonsCoach {
    data: TLessonsCoachSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TLessonsCoachSchema> | undefined;
}

export function useLessonsCoach(coachId: number, startDate?: string, endDate?: string): IuseLessonsCoach {
    const searchUrl = getLessonsCoachUrl(coachId, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        lessonsCoachFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseLessonsCoach = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseLessonsReader {
    data: TLessonsReaderSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TLessonsReaderSchema> | undefined;
}

export function useLessonsReader(readerId: number, startDate?: string, endDate?: string): IuseLessonsReader {
    const searchUrl = getLessonsReaderUrl(readerId, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        lessonsReaderFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseLessonsReader = { 
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
