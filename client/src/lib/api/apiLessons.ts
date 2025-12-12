import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddLessonSchema = z.object({
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue_id: z.number(),
});

export type TAddLessonData = z.TypeOf<typeof AddLessonSchema>;

const EditLessonSchema = z.object({
    lesson_id: z.number(),
    coach_id: z.number().optional(),
    reader_id: z.number().optional(),
    date: z.string().optional(),
    venue_id: z.number().optional(),
    status: z.string().optional(),
    attention: z.number().optional(),
    notes: z.string().optional(),
});

export type TEditLessonData = z.TypeOf<typeof EditLessonSchema>;

// -----------------------------------------------------------------------------

export async function addLesson(data: TAddLessonData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/lessons/add-lesson`;
    return posterAuth(url, data, AddLessonSchema);
}

export async function editLesson(data: TEditLessonData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/lessons/edit-lesson`;
    return posterAuth(url, data, EditLessonSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
