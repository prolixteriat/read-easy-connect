import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddReviewSchema = z.object({
    coordinator_id: z.number(),
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue_id: z.number(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export type TAddReviewData = z.TypeOf<typeof AddReviewSchema>;

const EditReviewSchema = z.object({
    review_id: z.number(),
    coordinator_id: z.number().optional(),
    coach_id: z.number().optional(),
    reader_id: z.number().optional(),
    date: z.string().optional(),
    venue_id: z.number().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export type TEditReviewData = z.TypeOf<typeof EditReviewSchema>;

// -----------------------------------------------------------------------------

export async function addReview(data: TAddReviewData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/reviews/add-review`;
    return posterAuth(url, data, AddReviewSchema);
}

export async function editReview(data: TEditReviewData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/reviews/edit-review`;
    return posterAuth(url, data, EditReviewSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
