import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getReviewsUrl = (): string => { return `${apiBaseUrl}/reviews/get-reviews`; }

const getReviewsCoordinatorUrl = (coordinatorId: number, startDate?: string, endDate?: string): string => {
    const url = `${apiBaseUrl}/reviews/get-reviews-coordinator`;
    const params = new URLSearchParams();
    params.append('coordinator_id', coordinatorId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `${url}?${params.toString()}`;
}

const reviewsFetcher = (data: string[]) => fetcherAuth(data, ReviewsSchemaArray);
const reviewsCoordinatorFetcher = (data: string[]) => fetcherAuth(data, ReviewsSchemaArray);

// -----------------------------------------------------------------------------

const ReviewsSchema = z.object({
    review_id: z.number(),
    coordinator_id: z.number(),
    coach_id: z.number(),
    reader_id: z.number(),
    date: z.string(),
    venue_id: z.number(),
    status: z.string(),
    notes: z.string().nullable(),
    created_at: z.string(),
    reader_name: z.string(),
    first_name: z.string(),
    last_name: z.string(),
});

const ReviewsSchemaArray = z.array(ReviewsSchema);

export type TReviewsSchema = z.TypeOf<typeof ReviewsSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseReviews {
    data: TReviewsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReviewsSchema> | undefined;
}   

export function useReviews(): IuseReviews {
    
    const searchUrl = getReviewsUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        reviewsFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseReviews = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseReviewsCoordinator {
    data: TReviewsSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TReviewsSchema> | undefined;
}

export function useReviewsCoordinator(coordinatorId: number, startDate?: string, endDate?: string): IuseReviewsCoordinator {
    const searchUrl = getReviewsCoordinatorUrl(coordinatorId, startDate, endDate);
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        reviewsCoordinatorFetcher, { 
            refreshInterval: 5 * 60 * 1000,
      });
    
    const response: IuseReviewsCoordinator = { 
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
