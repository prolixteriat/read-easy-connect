import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';
import { type TTrainingStatus } from '@lib/types';

// -----------------------------------------------------------------------------

const getCoachesUrl = (): string => { return `${apiBaseUrl}/coaches/get-coaches`; }
const getCoachUrl = (id: number): string => 
        { return `${apiBaseUrl}/coaches/get-coach?coach_id=${id}`; }

const coachesFetcher = (data: string[]) => fetcherAuth(data, CoachesSchemaArray);
const coachFetcher = (data: string[]) => fetcherAuth(data, CoachSchema);

// -----------------------------------------------------------------------------

const CoachSchema = z.object({
    coach_id: z.number(),
    coordinator_id: z.number().nullable(),
    coordinator_first_name: z.string().nullable(),
    coordinator_last_name: z.string().nullable(),
    area_id: z.number().nullable(),
    area_name: z.string().nullable(),
    status: z.string(),
    address: z.string().nullable(),
    telephone: z.string().nullable(),
    nok_name: z.string().nullable(),
    nok_telephone: z.string().nullable(),
    nok_relationship: z.string().nullable(),
    email_consent: z.number(),
    whatsapp_consent: z.number(),
    dbs_completed: z.number(),
    ref_completed: z.number(),
    commitment_completed: z.number(),
    training: z.custom<TTrainingStatus>(),
    edib_training: z.custom<TTrainingStatus>(),
    consol_training: z.custom<TTrainingStatus>(),
    use_email: z.number(),
    consol_training_at: z.string().nullable(),
    availability: z.string().nullable(),
    preferences: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    user_status: z.string(),
    disabled: z.number(),
    password_reset: z.number(),
    last_login: z.string().nullable(),
    user_created_at: z.string(),
});

const CoachesSchema = CoachSchema.omit({
    address: true,
    telephone: true,
    nok_name: true,
    nok_telephone: true,
    nok_relationship: true,
    last_login: true,
    user_created_at: true,
});

const CoachesSchemaArray = z.array(CoachesSchema);

export type TCoachSchema = z.TypeOf<typeof CoachSchema>;
export type TCoachesSchema = z.TypeOf<typeof CoachesSchemaArray>;

// -----------------------------------------------------------------------------
// Define hooks.

export interface IuseCoaches {
    data: TCoachesSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TCoachesSchema> | undefined;
}   

export function useCoaches(): IuseCoaches {
    
    const searchUrl = getCoachesUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        coachesFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseCoaches = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseCoach {
    data: TCoachSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TCoachSchema> | undefined;
}

export function useCoach(id: number | null): IuseCoach {
    const searchUrl = id ? getCoachUrl(id) : null;
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR(
        id ? [searchUrl, token] : null, 
        coachFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseCoach = { 
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
