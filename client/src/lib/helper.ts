
// -----------------------------------------------------------------------------
/* Example usage: 
    setErrorMessage(asString(result.message, 'An error occurred while saving'));
*/
export function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

// -----------------------------------------------------------------------------
/* Example usage: 
    if (hasKey(tokenData, 'token')) {
        const token = tokenData.token;
        if (typeof token === 'string') {
            // token is now typed as string
    }
    } 
*/
export function hasKey<K extends PropertyKey>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return typeof value === 'object'
      && value !== null
      && key in value;
}
// -----------------------------------------------------------------------------
/* Example usage: 
    if (hasKeys(tokenData, ['token', 'expires'])) {
        const token = tokenData.token;     // unknown
        const expires = tokenData.expires; // unknown
    } 
*/
export function hasKeys<K extends readonly PropertyKey[]>(
  value: unknown,
  keys: K
): value is Record<K[number], unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    keys.every(key => key in value)
  );
}
// -----------------------------------------------------------------------------
/* Example usage: 
    if (hasStringKey(tokenData, 'token')) {
        const token = tokenData.token; // string 
    } 
*/
export function hasStringKey<K extends PropertyKey>(
  value: unknown,
  key: K
): value is Record<K, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    key in value &&
    typeof (value as Record<K, unknown>)[key] === 'string'
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
