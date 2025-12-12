
// -----------------------------------------------------------------------------

type TEnvironment = 'dev' | 'prod' | 'test';

// -----------------------------------------------------------------------------

export const environment: TEnvironment = 'dev';

// -----------------------------------------------------------------------------

export const homeUrl = '';
export let apiBaseUrl: string = '';

// -----------------------------------------------------------------------------

export function initConfig(env: TEnvironment): void {

    if (env === 'dev') {
        apiBaseUrl = '';

    } else if (env === 'prod') {
        apiBaseUrl = '';

    } else if (env === 'test') {
        apiBaseUrl = '';

    } else {
        const msg = `(initConfig) Unknown environment: ${env}`;
        console.error(msg);
        throw new Error(msg);
    }
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
