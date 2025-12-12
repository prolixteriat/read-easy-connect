import { z } from 'zod';

// -----------------------------------------------------------------------------

export async function fetcher<T>(url: string, schema: z.ZodType<T>): Promise<T> {

    const response = await fetch(url);
  
    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
    }
  
    const json = await response.json();
  
    const parsed = schema.safeParse(json);
  
    if (parsed.success) {
        return parsed.data;
    }
  
    console.error('Zod validation error:', parsed.error.issues);
    throw new Error('Invalid data returned from API');
}
// -----------------------------------------------------------------------------
// Variant with JWT authorisation.

export async function fetcherAuth<T>(data: string[], schema: z.ZodType<T>): Promise<T> {

    if (data.length !== 2) {
        throw new Error('fetcherAuth: Invalid query data provided');
    }

    const url = data[0];
    const token = data[1];
    const response = await fetch(url, {
        method: 'GET',  
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        console.error('fetcherAuth: Network response was not ok:', response.body)
        let message = '';

        try {
            const data = await response.json();
            message = data.message ?? JSON.stringify(data);
            } 
        catch {
            message = `Network response was not ok: ${response.status}`;
        }
        throw new Error(message);
    }
  
    const json = await response.json();
    const parsed = schema.safeParse(json);
  
    if (parsed.success) {
        return parsed.data;
    }
  
    console.error('Zod validation error:', parsed.error.issues);
    throw new Error('Invalid data returned from API');
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
