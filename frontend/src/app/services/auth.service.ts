import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, AuthUser, UserRole } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, credentials).pipe(
      tap(response => {
        this.setToken(response.access_token);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getStoredUser(): AuthUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === UserRole.ADMIN;
  }

  isAgent(): boolean {
    const user = this.getUser();
    return user?.role === UserRole.AGENT;
  }

  hasRole(role: UserRole): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  // Check if user can access admin features (only admin)
  canAccessAdmin(): boolean {
    return this.isLoggedIn() && this.isAdmin();
  }

  // Check if user can access agent features (admin or agent)
  canAccessAgentFeatures(): boolean {
    return this.isLoggedIn() && (this.isAdmin() || this.isAgent());
  }
}
