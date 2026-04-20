import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getContactsUrl = (orgId?: number): string => {
    const url = `${apiBaseUrl}/contacts/get-contacts`;
    return orgId ? `${url}?org_id=${orgId}` : url;
}

const contactsFetcher = (data: string[]) => fetcherAuth(data, ContactsSchemaArray);

// -----------------------------------------------------------------------------

const ContactsSchema = z.object({
    contact_id: z.number(),
    org_id: z.number(),
    disabled: z.number(),
    created_at: z.string(),
    marketing_consent: z.number(),
    marketing_consent_at: z.string().nullable(),
    marketing_consent_source: z.string().nullable(),
    name: z.string(),
    role: z.string().nullable(),
    email: z.string().nullable(),
    telephone: z.string().nullable(),
    notes: z.string().nullable(),
    org_name: z.string(),
});

const ContactsSchemaArray = z.array(ContactsSchema);

export type TContactSchema = z.TypeOf<typeof ContactsSchema>;
export type TContactsSchema = z.TypeOf<typeof ContactsSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseContacts {
    data: TContactsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TContactsSchema> | undefined;
}   

export function useContacts(orgId?: number): IuseContacts {
    
    const searchUrl = getContactsUrl(orgId);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        contactsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseContacts = { 
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