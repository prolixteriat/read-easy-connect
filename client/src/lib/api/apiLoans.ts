import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddLoanSchema = z.object({
    reader_id: z.number(),
    item: z.string(),
    loan_date: z.string().optional(),
    return_date: z.string().optional(),
    status: z.string().optional(),
});

export type TAddLoanData = z.TypeOf<typeof AddLoanSchema>;

const EditLoanSchema = z.object({
    loan_id: z.number(),
    item: z.string().optional(),
    loan_date: z.string().optional(),
    return_date: z.string().optional(),
    status: z.string().optional(),
});
// -----------------------------------------------------------------------------

export type TEditLoanData = z.TypeOf<typeof EditLoanSchema>;

export async function addLoan(data: TAddLoanData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/loans/add-loan`;
    return posterAuth(url, data, AddLoanSchema);
}

export async function editLoan(data: TEditLoanData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/loans/edit-loan`;
    return posterAuth(url, data, EditLoanSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
