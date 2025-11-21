import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="star-rating" [class.readonly]="readonly">
      <span
        *ngFor="let star of stars; let i = index"
        class="star"
        [class.filled]="i < (hoverRating || rating)"
        [class.hover]="!readonly && i < hoverRating"
        (click)="onStarClick(i + 1)"
        (mouseenter)="onStarHover(i + 1)"
        (mouseleave)="onStarLeave()"
      >
        ★
      </span>
      <span class="rating-text" *ngIf="showText">
        {{ rating > 0 ? rating + ' / 5' : 'Select rating' }}
      </span>
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .star {
      font-size: 28px;
      color: #ddd;
      cursor: pointer;
      transition: color 0.2s, transform 0.2s;
    }

    .star-rating.readonly .star {
      cursor: default;
    }

    .star:not(.readonly):hover {
      transform: scale(1.1);
    }

    .star.filled {
      color: #ffc107;
    }

    .star.hover {
      color: #ffdb4d;
    }

    .rating-text {
      margin-left: 10px;
      color: #666;
      font-size: 14px;
    }

    /* Smaller variant */
    :host(.small) .star {
      font-size: 18px;
    }

    :host(.small) .rating-text {
      font-size: 12px;
    }
  `]
})
export class StarRatingComponent {
  @Input() rating = 0;
  @Input() readonly = false;
  @Input() showText = true;
  @Output() ratingChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hoverRating = 0;

  onStarClick(rating: number): void {
    if (this.readonly) return;
    this.rating = rating;
    this.ratingChange.emit(rating);
  }

  onStarHover(rating: number): void {
    if (this.readonly) return;
    this.hoverRating = rating;
  }

  onStarLeave(): void {
    this.hoverRating = 0;
  }
}
