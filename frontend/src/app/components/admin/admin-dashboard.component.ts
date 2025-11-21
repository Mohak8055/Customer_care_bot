import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DepartmentManagementComponent } from './department-management.component';
import { UserManagementComponent } from './user-management.component';
import { ReviewManagementComponent } from './review-management.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DepartmentManagementComponent, UserManagementComponent, ReviewManagementComponent],
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <div class="header-content">
          <div>
            <h1>Customer Care Bot - Admin Dashboard</h1>
            <p>Manage departments, users, and reviews</p>
          </div>
          <div class="header-actions">
            <span class="user-info" *ngIf="currentUser">
              Welcome, {{ currentUser.full_name || currentUser.username }}
            </span>
            <button class="btn btn-logout" (click)="logout()">Logout</button>
          </div>
        </div>
      </header>

      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab === 'departments'"
          (click)="activeTab = 'departments'"
        >
          Departments
        </button>
        <button
          class="tab"
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'"
        >
          Users
        </button>
        <button
          class="tab"
          [class.active]="activeTab === 'reviews'"
          (click)="activeTab = 'reviews'"
        >
          Reviews
        </button>
      </div>

      <div class="tab-content">
        <app-department-management *ngIf="activeTab === 'departments'"></app-department-management>
        <app-user-management *ngIf="activeTab === 'users'"></app-user-management>
        <app-review-management *ngIf="activeTab === 'reviews'"></app-review-management>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      min-height: 100vh;
      background: #f0f2f5;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .dashboard-header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
    }

    .dashboard-header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .tabs {
      display: flex;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      max-width: 1400px;
      margin: 0 auto;
    }

    .tab {
      flex: 1;
      padding: 15px 20px;
      border: none;
      background: white;
      cursor: pointer;
      font-size: 16px;
      font-weight: 500;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }

    .tab:hover {
      background: #f8f9fa;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab-content {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-info {
      font-size: 14px;
      opacity: 0.9;
    }

    .btn-logout {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `]
})
export class AdminDashboardComponent {
  activeTab: 'departments' | 'users' | 'reviews' = 'departments';
  currentUser: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
