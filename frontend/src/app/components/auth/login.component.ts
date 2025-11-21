import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, UserRole } from '../../models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Staff Login</h1>
          <p>Sign in to access the support portal</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              [(ngModel)]="credentials.username"
              name="username"
              required
              placeholder="Enter your username"
              [disabled]="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="credentials.password"
              name="password"
              required
              placeholder="Enter your password"
              [disabled]="isLoading"
            />
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-login"
            [disabled]="!credentials.username || !credentials.password || isLoading"
          >
            <span *ngIf="!isLoading">Sign In</span>
            <span *ngIf="isLoading">Signing in...</span>
          </button>
        </form>

        <div class="login-footer">
          <a routerLink="/chat">← Back to Customer Chat</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 400px;
      overflow: hidden;
    }

    .login-header {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }

    .login-header h1 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 24px;
    }

    .login-header p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .login-form {
      padding: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-group input {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s, box-shadow 0.3s;
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
    }

    .btn-login {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .login-footer {
      padding: 20px 30px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .login-footer a {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
    }

    .login-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  isLoading = false;
  errorMessage = '';
  returnUrl = '/agent';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }

    // Get return URL from route parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/agent';
  }

  onSubmit(): void {
    if (!this.credentials.username || !this.credentials.password) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.redirectBasedOnRole();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Invalid username or password';
      }
    });
  }

  private redirectBasedOnRole(): void {
    const user = this.authService.getUser();
    if (user?.role === UserRole.ADMIN) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/agent']);
    }
  }
}
