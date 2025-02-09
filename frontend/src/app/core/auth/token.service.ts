import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'flowcraft_token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly tokenChange = this.tokenState.asReadonly();

  getToken(): string | null {
    return this.tokenState();
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenState.set(token);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  decodePayload(token: string): Record<string, unknown> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
