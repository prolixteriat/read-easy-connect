import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getRegionsUrl = (): string => { return `${apiBaseUrl}/org/get-regions`; }
const getAffiliatesUrl = (regionId: number): string => { return `${apiBaseUrl}/org/get-affiliates?region_id=${regionId}`; }
const getAreasUrl = (): string => { return `${apiBaseUrl}/org/get-areas`; }
const getVenuesUrl = (): string => { return `${apiBaseUrl}/org/get-venues`; }

const regionsFetcher = (data: string[]) => fetcherAuth(data, RegionsSchemaArray);
const affiliatesFetcher = (data: string[]) => fetcherAuth(data, AffiliatesSchemaArray);
const areasFetcher = (data: string[]) => fetcherAuth(data, AreasSchemaArray);
const venuesFetcher = (data: string[]) => fetcherAuth(data, VenuesSchemaArray);

// -----------------------------------------------------------------------------

const RegionsSchema = z.object({
    region_id: z.number(),
    name: z.string(),
    created_at: z.string(),
    disabled: z.number(),
});

const AffiliatesSchema = z.object({
    affiliate_id: z.number(),
    name: z.string(),
    region_id: z.number(),
    created_at: z.string(),
    disabled: z.number(),
    region_name: z.string(),
});

const AreasSchema = z.object({
    area_id: z.number(),
    name: z.string(),
    affiliate_id: z.number(),
    created_at: z.string(),
    disabled: z.number(),
    affiliate_name: z.string(),
});

const VenuesSchema = z.object({
    venue_id: z.number(),
    name: z.string(),
    affiliate_id: z.number(),
    address: z.string().nullable(),
    contact_name: z.string().nullable(),
    contact_email: z.string().nullable(),
    contact_telephone: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    disabled: z.number(),
    affiliate_name: z.string(),
});

const RegionsSchemaArray = z.array(RegionsSchema);
const AffiliatesSchemaArray = z.array(AffiliatesSchema);
const AreasSchemaArray = z.array(AreasSchema);
const VenuesSchemaArray = z.array(VenuesSchema);

export type TRegionsSchema = z.TypeOf<typeof RegionsSchemaArray>;
export type TAffiliatesSchema = z.TypeOf<typeof AffiliatesSchemaArray>;
export type TAreasSchema = z.TypeOf<typeof AreasSchemaArray>;
export type TVenuesSchema = z.TypeOf<typeof VenuesSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseRegions {
    data: TRegionsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TRegionsSchema> | undefined;
}   

export function useRegions(): IuseRegions {
    
    const searchUrl = getRegionsUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        regionsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseRegions = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseAffiliates {
    data: TAffiliatesSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TAffiliatesSchema> | undefined;
}

export function useAffiliates(regionId: number): IuseAffiliates {
    const searchUrl = getAffiliatesUrl(regionId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        affiliatesFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseAffiliates = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseAreas {
    data: TAreasSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TAreasSchema> | undefined;
}

export function useAreas(): IuseAreas {
    const searchUrl = getAreasUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        areasFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseAreas = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseVenues {
    data: TVenuesSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TVenuesSchema> | undefined;
}

export function useVenues(): IuseVenues {
    const searchUrl = getVenuesUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        venuesFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseVenues = { 
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
