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
const getOrgsUrl = (): string => { return `${apiBaseUrl}/org/get-orgs`; }

const regionsFetcher = (data: string[]) => fetcherAuth(data, RegionsSchemaArray);
const affiliatesFetcher = (data: string[]) => fetcherAuth(data, AffiliatesSchemaArray);
const areasFetcher = (data: string[]) => fetcherAuth(data, AreasSchemaArray);
const venuesFetcher = (data: string[]) => fetcherAuth(data, VenuesSchemaArray);
const orgsFetcher = (data: string[]) => fetcherAuth(data, OrgsSchemaArray);

// -----------------------------------------------------------------------------

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
    reader_area: z.number(),
    org_area: z.number(),
    affiliate_name: z.string(),
});

const OrgsSchema = z.object({
    org_id: z.number(),
    name: z.string(),
    affiliate_id: z.number(),
    area_id: z.number().nullable(),
    role_civic: z.number(),
    role_donor: z.number(),
    role_network: z.number(),
    role_referrer: z.number(),
    role_supplier: z.number(),
    role_supporter: z.number(),
    role_venue: z.number(),
    role_volunteer: z.number(),
    reader_venue: z.number(),
    general_venue: z.number(),
    address: z.string().nullable(),
    description: z.string().nullable(),
    url: z.string().nullable(),
    status: z.string().nullable(),
    summary: z.string().nullable(),
    action: z.number(),
    disabled: z.number(),
    created_at: z.string(),
    area_name: z.string().nullable(),
});

const RegionsSchema = z.object({
    region_id: z.number(),
    name: z.string(),
    created_at: z.string(),
    disabled: z.number(),
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

const AffiliatesSchemaArray = z.array(AffiliatesSchema);
const AreasSchemaArray = z.array(AreasSchema);
const OrgsSchemaArray = z.array(OrgsSchema);
const RegionsSchemaArray = z.array(RegionsSchema);
const VenuesSchemaArray = z.array(VenuesSchema);

export type TAffiliatesSchema = z.TypeOf<typeof AffiliatesSchemaArray>;
export type TAreasSchema = z.TypeOf<typeof AreasSchemaArray>;
export type TOrgsSchema = z.TypeOf<typeof OrgsSchemaArray>;
export type TRegionsSchema = z.TypeOf<typeof RegionsSchemaArray>;
export type TVenuesSchema = z.TypeOf<typeof VenuesSchemaArray>;


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
            refreshInterval: 5 * 60 * 1000, 
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

export interface IuseOrgs {
    data: TOrgsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TOrgsSchema> | undefined;
}

export function useOrgs(): IuseOrgs {
    const searchUrl = getOrgsUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        orgsFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseOrgs = { 
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
