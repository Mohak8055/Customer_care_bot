import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Department, DepartmentCreate } from '../../models/models';

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="department-management">
      <h2>Department Management</h2>

      <!-- Add Department Form -->
      <div class="add-department">
        <h3>{{ editingDepartment ? 'Edit Department' : 'Add New Department' }}</h3>
        <form (ngSubmit)="saveDepartment()">
          <div class="form-group">
            <label>Name:</label>
            <input
              type="text"
              [(ngModel)]="departmentForm.name"
              name="name"
              required
              placeholder="Department Name"
            />
          </div>

          <div class="form-group">
            <label>Description:</label>
            <textarea
              [(ngModel)]="departmentForm.description"
              name="description"
              placeholder="Department Description"
            ></textarea>
          </div>

          <div class="form-group checkbox">
            <label>
              <input
                type="checkbox"
                [(ngModel)]="departmentForm.is_active"
                name="is_active"
              />
              Active
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input
                type="checkbox"
                [(ngModel)]="departmentForm.is_customer_care"
                name="is_customer_care"
              />
              Customer Care Department
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              {{ editingDepartment ? 'Update' : 'Add' }} Department
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="cancelEdit()"
              *ngIf="editingDepartment"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Department List -->
      <div class="department-list">
        <h3>Departments</h3>
        <div *ngIf="loading" class="loading">Loading departments...</div>
        <div *ngIf="error" class="error">{{ error }}</div>

        <table *ngIf="!loading && departments.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Customer Care</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let dept of departments">
              <td>{{ dept.name }}</td>
              <td>{{ dept.description || '-' }}</td>
              <td>
                <span [class]="dept.is_active ? 'badge-success' : 'badge-danger'">
                  {{ dept.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <span *ngIf="dept.is_customer_care" class="badge-info">Yes</span>
                <span *ngIf="!dept.is_customer_care">-</span>
              </td>
              <td>
                <button class="btn btn-sm" (click)="editDepartment(dept)">Edit</button>
                <button
                  class="btn btn-sm btn-danger"
                  (click)="deleteDepartment(dept.id)"
                  [disabled]="dept.is_customer_care"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && departments.length === 0" class="no-data">
          No departments found.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .department-management {
      padding: 20px;
      max-width: 1200px;
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

    .add-department {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .form-group input[type="text"],
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }

    .form-group.checkbox {
      display: flex;
      align-items: center;
    }

    .form-group.checkbox label {
      display: flex;
      align-items: center;
      margin-bottom: 0;
    }

    .form-group.checkbox input {
      margin-right: 8px;
      width: auto;
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

    .btn-danger:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
      margin-right: 5px;
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

    .badge-info {
      background: #17a2b8;
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
export class DepartmentManagementComponent implements OnInit {
  departments: Department[] = [];
  loading = false;
  error = '';

  departmentForm: DepartmentCreate = {
    name: '',
    description: '',
    is_active: true,
    is_customer_care: false
  };

  editingDepartment: Department | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;
    this.error = '';
    this.apiService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load departments';
        this.loading = false;
        console.error(err);
      }
    });
  }

  saveDepartment(): void {
    if (!this.departmentForm.name) {
      alert('Please enter a department name');
      return;
    }

    if (this.editingDepartment) {
      // Update existing department
      this.apiService.updateDepartment(this.editingDepartment.id, this.departmentForm).subscribe({
        next: () => {
          this.loadDepartments();
          this.resetForm();
        },
        error: (err) => {
          alert('Failed to update department');
          console.error(err);
        }
      });
    } else {
      // Create new department
      this.apiService.createDepartment(this.departmentForm).subscribe({
        next: () => {
          this.loadDepartments();
          this.resetForm();
        },
        error: (err) => {
          alert('Failed to create department');
          console.error(err);
        }
      });
    }
  }

  editDepartment(department: Department): void {
    this.editingDepartment = department;
    this.departmentForm = {
      name: department.name,
      description: department.description,
      is_active: department.is_active,
      is_customer_care: department.is_customer_care
    };
  }

  deleteDepartment(id: number): void {
    if (confirm('Are you sure you want to delete this department?')) {
      this.apiService.deleteDepartment(id).subscribe({
        next: () => {
          this.loadDepartments();
        },
        error: (err) => {
          alert('Failed to delete department');
          console.error(err);
        }
      });
    }
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingDepartment = null;
    this.departmentForm = {
      name: '',
      description: '',
      is_active: true,
      is_customer_care: false
    };
  }
}
