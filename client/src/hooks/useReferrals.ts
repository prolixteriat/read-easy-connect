import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';
import { type TReferralStatus } from '@lib/types';

// -----------------------------------------------------------------------------

const getReferralsUrl = (orgId?: number, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/referrals/get-referrals`;
    const params = new URLSearchParams();
    if (orgId) params.append('org_id', orgId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `${url}?${params.toString()}`;
}

const referralsFetcher = (data: string[]) => fetcherAuth(data, ReferralsSchemaArray);

// -----------------------------------------------------------------------------

const ReferralsSchema = z.object({
    referral_id: z.number(),
    org_id: z.number(),
    contact_id: z.number().nullable(),
    by_id: z.number(),
    status: z.custom<TReferralStatus>(),
    referral: z.string(),
    referral_at: z.string(),
    created_at: z.string(),
    org_name: z.string(),
    contact_name: z.string().nullable(),
    first_name: z.string(),
    last_name: z.string(),
    area_name: z.string().nullable(),
    reader_name: z.string().nullable()
});

const ReferralsSchemaArray = z.array(ReferralsSchema);

export type TReferralSchema = z.TypeOf<typeof ReferralsSchema>;
export type TReferralsSchema = z.TypeOf<typeof ReferralsSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseReferrals {
    data: TReferralsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReferralsSchema> | undefined;
}   

export function useReferrals(orgId?: number, startDate?: string, endDate?: string): IuseReferrals {
    
    const searchUrl = getReferralsUrl(orgId, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        referralsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseReferrals = { 
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