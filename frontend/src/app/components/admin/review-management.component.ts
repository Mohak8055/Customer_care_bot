import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Review, ReviewStats, Department, User, UserRole } from '../../models/models';
import { StarRatingComponent } from '../shared/star-rating.component';

@Component({
  selector: 'app-review-management',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent],
  template: `
    <div class="review-management">
      <!-- Stats Overview -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-value">{{ stats?.total_reviews || 0 }}</div>
          <div class="stat-label">Total Reviews</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-value">{{ (stats?.average_rating || 0).toFixed(1) }}</div>
          <div class="stat-label">Average Rating</div>
          <div class="stat-stars">
            <app-star-rating
              [rating]="Math.round(stats?.average_rating || 0)"
              [readonly]="true"
              [showText]="false"
              class="small"
            ></app-star-rating>
          </div>
        </div>
        <div class="stat-card" *ngFor="let rating of [5, 4, 3, 2, 1]">
          <div class="stat-value">{{ stats?.rating_distribution?.[rating] || 0 }}</div>
          <div class="stat-label">{{ rating }} Star{{ rating !== 1 ? 's' : '' }}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Department:</label>
          <select [(ngModel)]="filterDepartmentId" (change)="loadReviews()">
            <option [value]="null">All Departments</option>
            <option *ngFor="let dept of departments" [value]="dept.id">{{ dept.name }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Agent:</label>
          <select [(ngModel)]="filterAgentId" (change)="loadReviews()">
            <option [value]="null">All Agents</option>
            <option *ngFor="let agent of agents" [value]="agent.id">{{ agent.full_name || agent.username }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Rating:</label>
          <select [(ngModel)]="filterRating" (change)="loadReviews()">
            <option [value]="null">All Ratings</option>
            <option *ngFor="let r of [5, 4, 3, 2, 1]" [value]="r">{{ r }} Star{{ r !== 1 ? 's' : '' }}</option>
          </select>
        </div>
      </div>

      <!-- Reviews List -->
      <div class="reviews-list">
        <div class="review-card" *ngFor="let review of reviews">
          <div class="review-header">
            <div class="review-customer">
              <strong>{{ review.customer_name }}</strong>
              <span class="customer-email">{{ review.customer_email }}</span>
            </div>
            <div class="review-rating">
              <app-star-rating
                [rating]="review.rating"
                [readonly]="true"
                [showText]="false"
                class="small"
              ></app-star-rating>
            </div>
          </div>

          <div class="review-meta">
            <span class="meta-item" *ngIf="review.department_name">
              <strong>Department:</strong> {{ review.department_name }}
            </span>
            <span class="meta-item" *ngIf="review.agent_name">
              <strong>Agent:</strong> {{ review.agent_name }}
            </span>
            <span class="meta-item">
              <strong>Date:</strong> {{ formatDate(review.created_at) }}
            </span>
          </div>

          <div class="review-comment" *ngIf="review.comment">
            <p>"{{ review.comment }}"</p>
          </div>
        </div>

        <div class="no-reviews" *ngIf="reviews.length === 0 && !isLoading">
          <p>No reviews found matching your criteria.</p>
        </div>

        <div class="loading" *ngIf="isLoading">
          <p>Loading reviews...</p>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="reviews.length > 0">
        <button
          class="btn btn-secondary"
          [disabled]="currentPage === 0"
          (click)="loadPage(currentPage - 1)"
        >
          Previous
        </button>
        <span class="page-info">Page {{ currentPage + 1 }}</span>
        <button
          class="btn btn-secondary"
          [disabled]="reviews.length < pageSize"
          (click)="loadPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .review-management {
      padding: 20px;
    }

    .stats-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .stat-card.highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 13px;
      opacity: 0.8;
    }

    .stat-stars {
      margin-top: 8px;
    }

    .filters {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filter-group label {
      font-weight: 500;
      color: #555;
    }

    .filter-group select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      min-width: 150px;
    }

    .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .review-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .review-customer {
      display: flex;
      flex-direction: column;
    }

    .review-customer strong {
      font-size: 16px;
      color: #333;
    }

    .customer-email {
      font-size: 13px;
      color: #666;
    }

    .review-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }

    .review-comment {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }

    .review-comment p {
      margin: 0;
      font-style: italic;
      color: #555;
      line-height: 1.5;
    }

    .no-reviews, .loading {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      color: #666;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 20px;
      padding: 20px;
    }

    .page-info {
      font-size: 14px;
      color: #666;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host ::ng-deep .small .star {
      font-size: 16px;
    }
  `]
})
export class ReviewManagementComponent implements OnInit {
  Math = Math;

  reviews: Review[] = [];
  stats: ReviewStats | null = null;
  departments: Department[] = [];
  agents: User[] = [];

  filterDepartmentId: number | null = null;
  filterAgentId: number | null = null;
  filterRating: number | null = null;

  isLoading = false;
  currentPage = 0;
  pageSize = 20;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadAgents();
    this.loadStats();
    this.loadReviews();
  }

  loadDepartments(): void {
    this.apiService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (err) => console.error('Failed to load departments', err)
    });
  }

  loadAgents(): void {
    this.apiService.getUsers({ role: UserRole.AGENT }).subscribe({
      next: (users) => {
        this.agents = users;
      },
      error: (err) => console.error('Failed to load agents', err)
    });
  }

  loadStats(): void {
    const params: any = {};
    if (this.filterDepartmentId) params.department_id = this.filterDepartmentId;
    if (this.filterAgentId) params.agent_id = this.filterAgentId;

    this.apiService.getReviewStats(params).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  loadReviews(): void {
    this.isLoading = true;
    this.currentPage = 0;

    const params: any = {
      limit: this.pageSize,
      offset: 0
    };

    if (this.filterDepartmentId) params.department_id = this.filterDepartmentId;
    if (this.filterAgentId) params.agent_id = this.filterAgentId;
    if (this.filterRating) {
      params.min_rating = this.filterRating;
      params.max_rating = this.filterRating;
    }

    this.apiService.getReviews(params).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load reviews', err);
        this.isLoading = false;
      }
    });

    // Also reload stats when filters change
    this.loadStats();
  }

  loadPage(page: number): void {
    if (page < 0) return;

    this.isLoading = true;
    this.currentPage = page;

    const params: any = {
      limit: this.pageSize,
      offset: page * this.pageSize
    };

    if (this.filterDepartmentId) params.department_id = this.filterDepartmentId;
    if (this.filterAgentId) params.agent_id = this.filterAgentId;
    if (this.filterRating) {
      params.min_rating = this.filterRating;
      params.max_rating = this.filterRating;
    }

    this.apiService.getReviews(params).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load reviews', err);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
