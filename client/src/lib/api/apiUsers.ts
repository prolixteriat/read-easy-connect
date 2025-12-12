import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddUserSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    role: z.string(),
    affiliate_id: z.number().optional(),
    coordinator_id: z.number().optional(),
    manager_id: z.number().optional(),
    status: z.string().optional(),

});

export type TAddUserData = z.TypeOf<typeof AddUserSchema>;

const EditProfileSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
});

export type TEditProfileData = z.TypeOf<typeof EditProfileSchema>;

const EditUserSchema = z.object({
    user_id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    disabled: z.number().optional(),
    password_reset: z.number().optional(),
    status: z.string().optional(),
});

export type TEditUserData = z.TypeOf<typeof EditUserSchema>;

const CompleteMfaSetupSchema = z.object({
    email: z.string(),
    secret: z.string(),
    code: z.string(),
    password: z.string(),
    token: z.string(),
});

export type TCompleteMfaSetupData = z.TypeOf<typeof CompleteMfaSetupSchema>;

const CreateResetTokenSchema = z.object({
    email: z.string(),
    expiry: z.number().optional(),
});

export type TCreateResetTokenData = z.TypeOf<typeof CreateResetTokenSchema>;

const LoginSchema = z.object({
    email: z.string(),
    password: z.string(),
    mfa_code: z.string().optional(),
});

export type TLoginData = z.TypeOf<typeof LoginSchema>;

const LogoutSchema = z.object({});

const IsValidTokenSchema = z.object({});

const SubmitResetSchema = z.object({
    password: z.string(),
    token: z.string(),
});

export type TSubmitResetData = z.TypeOf<typeof SubmitResetSchema>;

// -----------------------------------------------------------------------------

export async function addUser(data: TAddUserData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/add-user`;
    return posterAuth(url, data, AddUserSchema);
}

export async function completeMfaSetup(data: TCompleteMfaSetupData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/complete-mfa-setup`;
    return posterAuth(url, data, CompleteMfaSetupSchema);
}

export async function createResetToken(data: TCreateResetTokenData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/create-reset-token`;
    return posterAuth(url, data, CreateResetTokenSchema);
}

export async function editProfile(data: TEditProfileData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/edit-profile`;
    return posterAuth(url, data, EditProfileSchema);
}

export async function editUser(data: TEditUserData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/edit-user`;
    return posterAuth(url, data, EditUserSchema);
}

export async function login(data: TLoginData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/login`;
    return posterAuth(url, data, LoginSchema);
}

export async function logout(): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/logout`;
    return posterAuth(url, {}, LogoutSchema);
}

export async function submitReset(data: TSubmitResetData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/submit-reset`;
    return posterAuth(url, data, SubmitResetSchema);
}

export async function isValidToken(): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/users/is-valid-token`;
    return posterAuth(url, {}, IsValidTokenSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
