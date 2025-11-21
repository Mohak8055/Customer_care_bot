import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { User, UserCreate, Department, UserRole, AgentStatus } from '../../models/models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management">
      <h2>User Management</h2>

      <!-- Add User Form -->
      <div class="add-user">
        <h3>{{ editingUser ? 'Edit User' : 'Add New User' }}</h3>
        <form (ngSubmit)="saveUser()">
          <div class="form-row">
            <div class="form-group">
              <label>Username:</label>
              <input
                type="text"
                [(ngModel)]="userForm.username"
                name="username"
                required
                placeholder="Username"
              />
            </div>

            <div class="form-group">
              <label>Email:</label>
              <input
                type="email"
                [(ngModel)]="userForm.email"
                name="email"
                required
                placeholder="Email"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Full Name:</label>
              <input
                type="text"
                [(ngModel)]="userForm.full_name"
                name="full_name"
                placeholder="Full Name"
              />
            </div>

            <div class="form-group" *ngIf="!editingUser">
              <label>Password:</label>
              <input
                type="password"
                [(ngModel)]="userForm.password"
                name="password"
                required
                placeholder="Password"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Role:</label>
              <select [(ngModel)]="userForm.role" name="role" required>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div class="form-group" *ngIf="userForm.role === 'agent'">
              <label>Department:</label>
              <select [(ngModel)]="userForm.department_id" name="department_id">
                <option [value]="undefined">-- Select Department --</option>
                <option *ngFor="let dept of departments" [value]="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              {{ editingUser ? 'Update' : 'Add' }} User
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="cancelEdit()"
              *ngIf="editingUser"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- User List -->
      <div class="user-list">
        <h3>Users</h3>

        <!-- Filters -->
        <div class="filters">
          <select [(ngModel)]="filterRole" (change)="loadUsers()">
            <option [value]="undefined">All Roles</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
          </select>

          <select [(ngModel)]="filterDepartment" (change)="loadUsers()">
            <option [value]="undefined">All Departments</option>
            <option *ngFor="let dept of departments" [value]="dept.id">
              {{ dept.name }}
            </option>
          </select>
        </div>

        <div *ngIf="loading" class="loading">Loading users...</div>
        <div *ngIf="error" class="error">{{ error }}</div>

        <table *ngIf="!loading && users.length > 0">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.username }}</td>
              <td>{{ user.full_name || '-' }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge-role" [class.badge-admin]="user.role === 'admin'"
                  [class.badge-agent]="user.role === 'agent'">
                  {{ user.role | titlecase }}
                </span>
              </td>
              <td>{{ user.department?.name || '-' }}</td>
              <td>
                <span *ngIf="user.role === 'agent'" class="badge-status"
                  [class.badge-available]="user.agent_status === 'available'"
                  [class.badge-busy]="user.agent_status === 'busy'"
                  [class.badge-offline]="user.agent_status === 'offline'">
                  {{ user.agent_status | titlecase }}
                </span>
                <span *ngIf="user.role !== 'agent'" [class]="user.is_active ? 'badge-success' : 'badge-danger'">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm" (click)="editUser(user)">Edit</button>
                <button class="btn btn-sm btn-danger" (click)="deleteUser(user.id)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && users.length === 0" class="no-data">
          No users found.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-management {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 30px;
      color: #333;
    }

    h3 {
      margin-bottom: 15px;
      color: #555;
    }

    .add-user {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
      margin-right: 5px;
    }

    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .filters select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }

    .badge-role, .badge-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: white;
    }

    .badge-admin {
      background: #dc3545;
    }

    .badge-agent {
      background: #007bff;
    }

    .badge-available {
      background: #28a745;
    }

    .badge-busy {
      background: #ffc107;
      color: #333;
    }

    .badge-offline {
      background: #6c757d;
    }

    .badge-success {
      background: #28a745;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .badge-danger {
      background: #dc3545;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .loading, .error, .no-data {
      padding: 20px;
      text-align: center;
      color: #666;
    }

    .error {
      color: #dc3545;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  departments: Department[] = [];
  loading = false;
  error = '';

  filterRole?: UserRole;
  filterDepartment?: number;

  userForm: UserCreate = {
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: UserRole.AGENT,
    department_id: undefined
  };

  editingUser: User | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadUsers();
  }

  loadDepartments(): void {
    this.apiService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (err) => {
        console.error('Failed to load departments', err);
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    const params: any = {};
    if (this.filterRole) {
      params.role = this.filterRole;
    }
    if (this.filterDepartment) {
      params.department_id = this.filterDepartment;
    }

    this.apiService.getUsers(params).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users';
        this.loading = false;
        console.error(err);
      }
    });
  }

  saveUser(): void {
    if (!this.userForm.username || !this.userForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    if (!this.editingUser && !this.userForm.password) {
      alert('Please enter a password');
      return;
    }

    if (this.editingUser) {
      // Update existing user
      const updateData: any = {
        username: this.userForm.username,
        email: this.userForm.email,
        full_name: this.userForm.full_name,
        role: this.userForm.role,
        department_id: this.userForm.department_id
      };

      this.apiService.updateUser(this.editingUser.id, updateData).subscribe({
        next: () => {
          this.loadUsers();
          this.resetForm();
        },
        error: (err) => {
          alert('Failed to update user');
          console.error(err);
        }
      });
    } else {
      // Create new user
      this.apiService.createUser(this.userForm).subscribe({
        next: () => {
          this.loadUsers();
          this.resetForm();
        },
        error: (err) => {
          alert('Failed to create user');
          console.error(err);
        }
      });
    }
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.userForm = {
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for editing
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id
    };
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.apiService.deleteUser(id).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          alert('Failed to delete user');
          console.error(err);
        }
      });
    }
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingUser = null;
    this.userForm = {
      username: '',
      email: '',
      password: '',
      full_name: '',
      role: UserRole.AGENT,
      department_id: undefined
    };
  }
}
