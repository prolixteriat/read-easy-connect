import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddContactSchema = z.object({
    org_id: z.number(),
    name: z.string(),
    role: z.string(),
    email: z.string(),
    telephone: z.string(),
    notes: z.string(),
    marketing_consent: z.number().optional(),
    marketing_consent_at: z.string().nullable().optional(),
    marketing_consent_source: z.string().nullable().optional(),
});

export type TAddContactData = z.TypeOf<typeof AddContactSchema>;

const EditContactSchema = z.object({
    contact_id: z.number(),
    org_id: z.number().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
    notes: z.string().optional(),
    marketing_consent: z.number().optional(),
    marketing_consent_at: z.string().nullable().optional(),
    marketing_consent_source: z.string().nullable().optional(),
    disabled: z.number().optional(),
});

export type TEditContactData = z.TypeOf<typeof EditContactSchema>;

// -----------------------------------------------------------------------------

export async function addContact(data: TAddContactData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/contacts/add-contact`;
    return posterAuth(url, data, AddContactSchema);
}

export async function editContact(data: TEditContactData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/contacts/edit-contact`;
    return posterAuth(url, data, EditContactSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------