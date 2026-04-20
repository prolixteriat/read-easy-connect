import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type TReferralStatus } from '@lib/types';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddReferralSchema = z.object({
    org_id: z.number(),
    contact_id: z.number().nullable().optional(),
    by_id: z.number(),
    status: z.custom<TReferralStatus>(),
    referral: z.string(),
    referral_at: z.string(),
});

export type TAddReferralData = z.TypeOf<typeof AddReferralSchema>;

const EditReferralSchema = z.object({
    referral_id: z.number(),
    org_id: z.number().optional(),
    contact_id: z.number().nullable().optional(),
    by_id: z.number().optional(),
    status: z.custom<TReferralStatus>().optional(),
    referral: z.string().optional(),
    referral_at: z.string().optional(),
});

export type TEditReferralData = z.TypeOf<typeof EditReferralSchema>;

// -----------------------------------------------------------------------------

export async function addReferral(data: TAddReferralData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/referrals/add-referral`;
    return posterAuth(url, data, AddReferralSchema);
}

export async function editReferral(data: TEditReferralData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/referrals/edit-referral`;
    return posterAuth(url, data, EditReferralSchema);
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------