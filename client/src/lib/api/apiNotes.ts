import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
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

const EditCoachNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
});

export type TEditCoachNoteData = z.TypeOf<typeof EditCoachNoteSchema>;

const EditReaderNoteSchema = z.object({
    note_id: z.number(),
    note: z.string().optional(),
    note_at: z.string().optional(),
});

export type TEditReaderNoteData = z.TypeOf<typeof EditReaderNoteSchema>;

// -----------------------------------------------------------------------------

export async function addCoachNote(data: TAddCoachNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-coach-note`;
    return posterAuth(url, data, AddCoachNoteSchema);
}

export async function addReaderNote(data: TAddReaderNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/add-reader-note`;
    return posterAuth(url, data, AddReaderNoteSchema);
}

export async function editCoachNote(data: TEditCoachNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-coach-note`;
    return posterAuth(url, data, EditCoachNoteSchema);
}

export async function editReaderNote(data: TEditReaderNoteData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/notes/edit-reader-note`;
    return posterAuth(url, data, EditReaderNoteSchema);
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------