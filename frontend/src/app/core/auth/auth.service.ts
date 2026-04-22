import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { User, AuthResponse, MessageResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => {
    this.tokenService.tokenChange();
    return this.tokenService.isLoggedIn();
  });

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService,
  ) {}

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/users/login`, { email, password })
      .pipe(
        tap((res) => {
          this.tokenService.setToken(res.token);
          this.currentUser.set(res.user);
        }),
      );
  }

  register(name: string, email: string, password: string, confirmPassword: string) {
    return this.http.post<MessageResponse>(`${this.apiUrl}/users/create`, {
      name,
      email,
      password,
      confirmPassword,
    });
  }

  logout() {
    return this.http.post(`${this.apiUrl}/users/logout`, {}).pipe(
      tap(() => {
        this.tokenService.removeToken();
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }),
      catchError(() => {
        this.tokenService.removeToken();
        this.currentUser.set(null);
        this.router.navigate(['/login']);
        return of(null);
      }),
    );
  }

  activateAccount(token: string) {
    return this.http.get<MessageResponse>(`${this.apiUrl}/user/${token}`);
  }

  requestPasswordReset(email: string) {
    return this.http.post<MessageResponse>(`${this.apiUrl}/user/account/forget/password`, {
      email,
    });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<MessageResponse>(`${this.apiUrl}/user/account/reset/password`, {
      token,
      password,
    });
  }

  requestDeactivation(token: string) {
    return this.http.post<MessageResponse>(`${this.apiUrl}/users/deactivate/${token}`, {});
  }

  confirmDeactivation(token: string) {
    return this.http.post<MessageResponse>(`${this.apiUrl}/deactivate/${token}`, {});
  }

  fetchProfile() {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  clearSession(): void {
    this.tokenService.removeToken();
    this.currentUser.set(null);
  }

  updateUser(patch: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;
    this.currentUser.set({ ...current, ...patch });
  }
}
