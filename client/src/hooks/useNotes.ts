import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getCoachNotesUrl = (aboutId?: number): string => {
    const url = `${apiBaseUrl}/notes/get-coach-notes`;
    return aboutId ? `${url}?about_id=${aboutId}` : url;
}

const getReaderNotesUrl = (aboutId?: number): string => {
    const url = `${apiBaseUrl}/notes/get-reader-notes`;
    return aboutId ? `${url}?about_id=${aboutId}` : url;
}

const notesFetcher = (data: string[]) => fetcherAuth(data, NotesSchemaArray);

// -----------------------------------------------------------------------------

const NotesSchema = z.object({
    note_id: z.number(),
    about_id: z.number(),
    by_id: z.number(),
    note: z.string(),
    note_at: z.string(),
    created_at: z.string(),
    about_name: z.string(),
    by_name: z.string(),
});

const NotesSchemaArray = z.array(NotesSchema);

export type TNoteSchema = z.TypeOf<typeof NotesSchema>;
export type TNotesSchema = z.TypeOf<typeof NotesSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseNotes {
    data: TNotesSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TNotesSchema> | undefined;
}   

export function useCoachNotes(aboutId?: number): IuseNotes {
    const searchUrl = getCoachNotesUrl(aboutId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        notesFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseNotes = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}

// -----------------------------------------------------------------------------

export function useReaderNotes(aboutId?: number): IuseNotes {
    const searchUrl = getReaderNotesUrl(aboutId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        notesFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseNotes = { 
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