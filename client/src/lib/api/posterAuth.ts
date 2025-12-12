import { z } from 'zod';

import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

export interface IApiResponse {
    success: boolean;
    message: unknown;
    statusCode: number;
}

export async function posterAuth<T>(url: string, data: T, schema: z.ZodSchema<T>): Promise<IApiResponse> {
    const response: IApiResponse = { success: false, message: '', statusCode: 0 };
    
    try {
        const validatedData = schema.parse(data);
        const token = new JwtManager().getToken();
        
        const result = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(validatedData)
        });
        response.statusCode = result.status;
        const raw = await result.json();
        if (!result.ok) {
            response.success = false;
            response.message = raw?.message ?? result.statusText;
        } else {
            response.success = true;
            response.message = raw ?? 'Success';
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            response.message = `Validation error: ${error.issues.map(e => e.message).join(', ')}`;
        } else {
            response.message = (error instanceof Error) ? error.message : 'Error occurred';
        }
    }
    
    return response;
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
