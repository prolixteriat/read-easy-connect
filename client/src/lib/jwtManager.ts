import { type TRole } from '@lib/types';

// -----------------------------------------------------------------------------

export class JwtManager {

    private readonly storageKey = 'readeasy_connect_jwt';
  
    private token: string;
    private email: string;
    private expires: Date;
    private role: TRole;
    private userId: number;

    constructor() {
        this.email = '';        
        this.expires = new Date();
        this.role = 'coach';
        this.token = '';
        this.userId = -1;
        this.readToken();
    }

    public getEmail(): string {
        return this.email;
    }

    public getRole(): TRole {
        return this.role;
    }
    
    public getToken(): string {
        return this.token;
    }

    public getUserId(): number {
        return this.userId;
    }

    private init() {
        this.email = '';
        this.expires = new Date();
        this.role = 'coach';
        this.token = '';
        this.userId = -1;
    }
    public isCurrent(): boolean {
        return !this.isExpired();
    }

    public isExpired(): boolean {
        return this.expires < new Date();
    }

    public isAdmin(): boolean {
        return this.role === 'admin';
    }

    public isLoggedIn(): boolean {
        return (this.email.length) > 0 && this.isCurrent();
    }

    public isLoggedOut(): boolean {
        return !this.isLoggedIn();
    }

    public logOut(): void {
        localStorage.removeItem(this.storageKey);
        this.init();
        return;
    }

    private parseToken(): void {
        if (!this.token) {
            return;
        }
        const arrayToken = this.token.split('.');
        if (arrayToken.length !== 3) {
            return;
        }
		const tokenPayload = JSON.parse(atob(arrayToken[1]));
        this.email = tokenPayload.email || tokenPayload.sub || '';
        this.expires = new Date(tokenPayload.exp * 1000);
        this.role = tokenPayload.role;
        this.userId = tokenPayload.user_id;
    }

    public readToken(): void {
        this.token = localStorage.getItem(this.storageKey) || '';
        this.parseToken();
    }

    public writeToken(token: string) {
        localStorage.setItem(this.storageKey, token);
        this.readToken();
    }
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
