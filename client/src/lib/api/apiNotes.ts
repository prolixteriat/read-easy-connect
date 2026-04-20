import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type TOrgType } from '@lib/types';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddCoachNoteSchema = z.object({
    about_id: z.number(),
    note: z.string(),
    note_at: z.string().optional(),
});

export type TAddCoachNoteData = z.TypeOf<typeof AddCoachNoteSchema>;

const AddReaderNoteSchema = z.object({
    about_id: z.number(),
    note: z.string(),
    note_at: z.string().optional(),
});

export type TAddReaderNoteData = z.TypeOf<typeof AddReaderNoteSchema>;

const AddReferralNoteSchema = z.object({
    about_id: z.number(),
    note: z.string(),
    note_at: z.string().optional(),
});

export type TAddReferralNoteData = z.TypeOf<typeof AddReferralNoteSchema>;

const EditCoachNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
});

export type TEditCoachNoteData = z.TypeOf<typeof EditCoachNoteSchema>;

const AddOrgNoteSchema = z.object({
    about_id: z.number(),
    note: z.string(),
    note_at: z.string().optional(),
    type: z.custom<TOrgType>().nullable().optional(),
});

export type TAddOrgNoteData = z.TypeOf<typeof AddOrgNoteSchema>;

const EditOrgNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
    type: z.custom<TOrgType>().nullable().optional(),
});

export type TEditOrgNoteData = z.TypeOf<typeof EditOrgNoteSchema>;

const EditReaderNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
});

export type TEditReaderNoteData = z.TypeOf<typeof EditReaderNoteSchema>;

const EditReferralNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
});

export type TEditReferralNoteData = z.TypeOf<typeof EditReferralNoteSchema>;

// -----------------------------------------------------------------------------

export async function addCoachNote(data: TAddCoachNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-coach-note`;
    return posterAuth(url, data, AddCoachNoteSchema);
}

export async function addOrgNote(data: TAddOrgNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-org-note`;
    return posterAuth(url, data, AddOrgNoteSchema);
}

export async function addReaderNote(data: TAddReaderNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-reader-note`;
    return posterAuth(url, data, AddReaderNoteSchema);
}

export async function addReferralNote(data: TAddReferralNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-referral-note`;
    return posterAuth(url, data, AddReferralNoteSchema);
}

export async function editCoachNote(data: TEditCoachNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-coach-note`;
    return posterAuth(url, data, EditCoachNoteSchema);
}

export async function editOrgNote(data: TEditOrgNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-org-note`;
    return posterAuth(url, data, EditOrgNoteSchema);
}

export async function editReaderNote(data: TEditReaderNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-reader-note`;
    return posterAuth(url, data, EditReaderNoteSchema);
}

export async function editReferralNote(data: TEditReferralNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-referral-note`;
    return posterAuth(url, data, EditReferralNoteSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------