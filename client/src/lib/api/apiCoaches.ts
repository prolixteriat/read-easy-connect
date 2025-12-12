import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddCoachSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),

    address: z.string().optional(),
    telephone: z.string().optional(),
    nok_name: z.string().optional(),
    nok_telephone: z.string().optional(),
    nok_relationship: z.string().optional(),
    status: z.string().optional(),
    user_status: z.string().optional(),
    disabled: z.number().optional(),
    password_reset: z.number().optional(),
    coordinator_id: z.number().nullable().optional(),
    area_id: z.number().nullable().optional(),
    email_consent: z.number().optional(),
    whatsapp_consent: z.number().optional(),
    dbs_completed: z.number().optional(),
    ref_completed: z.number().optional(),
    commitment_completed: z.number().optional(),
    training_booked: z.number().optional(),
    edib_train_completed: z.number().optional(),
    consol_train_completed: z.number().optional(),
    availability: z.string().optional(),
    preferences: z.string().optional(),
    notes: z.string().optional(),    
});

export type TAddCoachData = z.TypeOf<typeof AddCoachSchema>;

const EditCoachSchema = z.object({
    coach_id: z.number(),
    address: z.string().optional(),
    telephone: z.string().optional(),
    nok_name: z.string().optional(),
    nok_telephone: z.string().optional(),
    nok_relationship: z.string().optional(),
    status: z.string().optional(),
    user_status: z.string().optional(),
    disabled: z.number().optional(),
    password_reset: z.number().optional(),
    coordinator_id: z.number().nullable().optional(),
    area_id: z.number().nullable().optional(),
    email_consent: z.number().optional(),
    whatsapp_consent: z.number().optional(),
    dbs_completed: z.number().optional(),
    ref_completed: z.number().optional(),
    commitment_completed: z.number().optional(),
    training_booked: z.number().optional(),
    edib_train_completed: z.number().optional(),
    consol_train_completed: z.number().optional(),
    availability: z.string().optional(),
    preferences: z.string().optional(),
    notes: z.string().optional(),
});

export type TEditCoachData = z.TypeOf<typeof EditCoachSchema>;

// -----------------------------------------------------------------------------

export async function addCoach(data: TAddCoachData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/coaches/add-coach`;
    return posterAuth(url, data, AddCoachSchema);
}

export async function editCoach(data: TEditCoachData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/coaches/edit-coach`;
    return posterAuth(url, data, EditCoachSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
