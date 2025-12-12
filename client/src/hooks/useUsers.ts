import useSWR, { type KeyedMutator } from 'swr';

import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

const getUsersUrl = (): string => { return `${apiBaseUrl}/users/get-users`; }
const getResetFormUrl = (token: string): string => { return `${apiBaseUrl}/users/get-reset-form?token=${token}`; }

const usersFetcher = (data: string[]) => fetcherAuth(data, UsersSchemaArray);
const resetFormFetcher = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error - status: ${response.status}`);
    }
    return response.text();
};
// -----------------------------------------------------------------------------

const UsersSchema = z.object({
    user_id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),    
    disabled: z.number(),
    role: z.string(),
    status: z.string(),
    affiliate_id: z.number(),
});

const UsersSchemaArray = z.array(UsersSchema);

export type TUsersSchema = z.TypeOf<typeof UsersSchemaArray>;

// -----------------------------------------------------------------------------

export interface IuseUsers {
    data: TUsersSchema | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<TUsersSchema> | undefined;
}   

export function useUsers(): IuseUsers {
    
    const searchUrl = getUsersUrl();
    const token = new JwtManager().getToken();
    const { data, error, isLoading, mutate } = useSWR([searchUrl, token], 
        usersFetcher, { 
            refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      });
    
    const response: IuseUsers = { 
        data: data, 
        error: error, 
        isLoading: isLoading,
        mutate: mutate
    };

    return response;
}
// -----------------------------------------------------------------------------

export interface IuseResetForm {
    data: string | undefined;
    error: Error | undefined;
    isLoading: boolean | undefined;
    mutate: KeyedMutator<string> | undefined;
}

export function useResetForm(token: string): IuseResetForm {
    const searchUrl = getResetFormUrl(token);
    const { data, error, isLoading, mutate } = useSWR(searchUrl, resetFormFetcher);
    
    const response: IuseResetForm = { 
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
