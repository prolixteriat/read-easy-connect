import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const EditReaderSchema = z.object({
    reader_id: z.number(),
    name: z.string().optional(),
    area_id: z.number().nullable().optional(),
    coach_id: z.number().nullable().optional(),
    level: z.string().optional(),
    status: z.string().optional(),
    referrer_name: z.string().nullable().optional(),
    referrer_org: z.string().nullable().optional(),
    availability: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    enrolment_at: z.string().nullable().optional(),
    coaching_start_at: z.string().nullable().optional(),
    graduation_at: z.string().nullable().optional(),
    TP1_start_at: z.string().nullable().optional(),
    TP2_start_at: z.string().nullable().optional(),
    TP3_start_at: z.string().nullable().optional(),
    TP4_start_at: z.string().nullable().optional(),
    TP5_start_at: z.string().nullable().optional(),
    TP1_completion_at: z.string().nullable().optional(),
    TP2_completion_at: z.string().nullable().optional(),
    TP3_completion_at: z.string().nullable().optional(),
    TP4_completion_at: z.string().nullable().optional(),
    TP5_completion_at: z.string().nullable().optional(),
    ons4_1: z.number().optional(),
    ons4_2: z.number().optional(),
    ons4_3: z.number().optional(),
});

export type TEditReaderData = z.TypeOf<typeof EditReaderSchema>;

const AddReaderSchema = z.object({
    name: z.string(),
    area_id: z.number().optional(),
    coach_id: z.number().optional(),
    enrolment_at: z.string().nullable().optional(),
    referrer_name: z.string().nullable().optional(),
    referrer_org: z.string().nullable().optional(),
    availability: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export type TAddReaderData = z.TypeOf<typeof AddReaderSchema>;

// -----------------------------------------------------------------------------

export async function addReader(data: TAddReaderData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/readers/add-reader`;
    return posterAuth(url, data, AddReaderSchema);
}

export async function editReader(data: TEditReaderData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/readers/edit-reader`;
    return posterAuth(url, data, EditReaderSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
