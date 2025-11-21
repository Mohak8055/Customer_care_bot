import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import {
  Department,
  ChatSession,
  Message,
  ChatSessionCreate,
  MessageCreate,
  WSMessage,
  ChatStatus,
  ReviewCreate,
  QueueStatus
} from '../../models/models';
import { Subscription } from 'rxjs';
import { StarRatingComponent } from '../shared/star-rating.component';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent],
  template: `
    <div class="chat-app">
      <!-- Pre-Chat: Welcome Screen -->
      <div class="welcome-screen" *ngIf="!chatSession">
        <div class="welcome-container">
          <div class="welcome-header">
            <div class="logo-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h1>Welcome to Support</h1>
            <p>We're here to help you. Start a conversation with our team.</p>
          </div>

          <form class="welcome-form" (ngSubmit)="startChat()">
            <div class="input-group">
              <label>Your Name</label>
              <input
                type="text"
                [(ngModel)]="customerName"
                name="customerName"
                required
                placeholder="John Doe"
              />
            </div>

            <div class="input-group">
              <label>Email Address</label>
              <input
                type="email"
                [(ngModel)]="customerEmail"
                name="customerEmail"
                required
                placeholder="john@example.com"
              />
            </div>

            <div class="input-group" *ngIf="departments.length > 0">
              <label>How can we help?</label>
              <div class="department-grid">
                <button
                  type="button"
                  *ngFor="let dept of departments"
                  class="dept-btn"
                  [class.active]="selectedDepartmentId === dept.id"
                  (click)="selectDepartment(dept.id)"
                >
                  <span class="dept-icon">{{ getDeptIcon(dept.name) }}</span>
                  <span class="dept-name">{{ dept.name }}</span>
                </button>
              </div>
              <span class="hint">Select a topic or skip to chat with general support</span>
            </div>

            <button
              type="submit"
              class="start-btn"
              [disabled]="!customerName || !customerEmail"
            >
              <span>Start Conversation</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        </div>
      </div>

      <!-- Active Chat Screen -->
      <div class="chat-screen" *ngIf="chatSession">
        <!-- Chat Header -->
        <header class="chat-header">
          <div class="header-left">
            <div class="status-dot" [class.active]="chatSession.status === 'active'"></div>
            <div class="header-info">
              <h2>{{ chatSession.department?.name || 'Support Chat' }}</h2>
              <span class="status-text">
                <ng-container *ngIf="chatSession.status === 'waiting'">Connecting you with an agent...</ng-container>
                <ng-container *ngIf="chatSession.status === 'active'">Chatting with {{ chatSession.assigned_agent?.full_name || 'Agent' }}</ng-container>
                <ng-container *ngIf="chatSession.status === 'closed'">Conversation ended</ng-container>
              </span>
            </div>
          </div>
          <button
            class="end-btn"
            *ngIf="chatSession.status !== 'closed'"
            (click)="endChat()"
          >
            End Chat
          </button>
        </header>

        <!-- Waiting Indicator with Queue Status -->
        <div class="waiting-banner" *ngIf="chatSession.status === 'waiting'">
          <div class="queue-status-container">
            <div class="pulse-ring"></div>
            <div class="queue-info">
              <span class="queue-title" *ngIf="!queueStatus || queueStatus.position === 0">
                Looking for an available agent...
              </span>
              <ng-container *ngIf="queueStatus && queueStatus.position > 0">
                <span class="queue-title">All agents are currently busy</span>
                <span class="queue-position">You are #{{ queueStatus.position }} in queue</span>
                <span class="queue-wait">Estimated wait: {{ queueStatus.estimated_wait_minutes }} minutes</span>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Messages Area -->
        <main class="messages-area" #messagesContainer>
          <div class="messages-wrapper">
            <div
              *ngFor="let msg of messages"
              class="message-row"
              [class.outgoing]="msg.sender_name === customerName"
              [class.system]="msg.is_system_message"
            >
              <div class="message-bubble">
                <span class="sender" *ngIf="msg.sender_name !== customerName && !msg.is_system_message">
                  {{ msg.sender_name }}
                </span>
                <p class="content">{{ msg.content }}</p>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
            </div>

            <div class="typing-row" *ngIf="otherTyping">
              <div class="typing-bubble">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
          </div>
        </main>

        <!-- Input Area -->
        <footer class="input-area" *ngIf="chatSession.status !== 'closed'">
          <input
            type="text"
            [(ngModel)]="messageText"
            (keyup.enter)="sendMessage()"
            (keyup)="onTyping()"
            placeholder="Type a message..."
            class="message-input"
          />
          <button
            class="send-btn"
            (click)="sendMessage()"
            [disabled]="!messageText.trim()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </footer>

        <!-- Closed Chat Banner -->
        <div class="closed-banner" *ngIf="chatSession.status === 'closed' && !showReviewModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Thank you for chatting with us!</span>
        </div>
      </div>

      <!-- Review Modal -->
      <div class="modal-overlay" *ngIf="showReviewModal" (click)="skipReview()">
        <div class="review-modal" (click)="$event.stopPropagation()">
          <div class="modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <h3>How was your experience?</h3>
          <p>Your feedback helps us improve</p>

          <div class="rating-container">
            <app-star-rating
              [rating]="reviewRating"
              (ratingChange)="reviewRating = $event"
              [showText]="true"
            ></app-star-rating>
          </div>

          <textarea
            [(ngModel)]="reviewComment"
            placeholder="Tell us more (optional)..."
            rows="3"
          ></textarea>

          <div class="modal-actions">
            <button class="skip-btn" (click)="skipReview()">Skip</button>
            <button
              class="submit-btn"
              (click)="submitReview()"
              [disabled]="reviewRating === 0 || isSubmittingReview"
            >
              {{ isSubmittingReview ? 'Sending...' : 'Submit' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Success Toast -->
      <div class="toast" *ngIf="reviewSubmitted && chatSession?.status === 'closed'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Thanks for your feedback!
      </div>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .chat-app {
      height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* Welcome Screen */
    .welcome-screen {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .welcome-container {
      width: 100%;
      max-width: 440px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 48px 40px;
      backdrop-filter: blur(20px);
    }

    .welcome-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo-circle {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);
    }

    .logo-circle svg {
      width: 32px;
      height: 32px;
      color: white;
    }

    .welcome-header h1 {
      color: #fff;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .welcome-header p {
      color: rgba(255, 255, 255, 0.6);
      font-size: 15px;
      line-height: 1.5;
    }

    .welcome-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-group label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      font-weight: 500;
    }

    .input-group input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 15px;
      color: #fff;
      transition: all 0.2s;
    }

    .input-group input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .input-group input:focus {
      outline: none;
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }

    .department-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .dept-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dept-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .dept-btn.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: #6366f1;
    }

    .dept-icon {
      font-size: 24px;
    }

    .dept-name {
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      font-weight: 500;
    }

    .hint {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      margin-top: 4px;
    }

    .start-btn {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 12px;
      padding: 16px 24px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s;
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    }

    .start-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 15px 40px rgba(99, 102, 241, 0.4);
    }

    .start-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .start-btn svg {
      width: 18px;
      height: 18px;
    }

    /* Chat Screen */
    .chat-screen {
      height: 100%;
      display: flex;
      flex-direction: column;
      max-width: 800px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.02);
      border-left: 1px solid rgba(255, 255, 255, 0.05);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #fbbf24;
    }

    .status-dot.active {
      background: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
    }

    .header-info h2 {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .status-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
    }

    .end-btn {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .end-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .waiting-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(251, 191, 36, 0.1);
      border-bottom: 1px solid rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .queue-status-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .queue-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .queue-title {
      font-size: 15px;
      font-weight: 600;
    }

    .queue-position {
      font-size: 14px;
      color: rgba(251, 191, 36, 0.9);
    }

    .queue-wait {
      font-size: 13px;
      color: rgba(251, 191, 36, 0.7);
    }

    .pulse-ring {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fbbf24;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
      }
      70% {
        box-shadow: 0 0 0 12px rgba(251, 191, 36, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
      }
    }

    /* Messages Area */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .messages-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message-row {
      display: flex;
      align-items: flex-end;
    }

    .message-row.outgoing {
      justify-content: flex-end;
    }

    .message-row.system {
      justify-content: center;
    }

    .message-bubble {
      max-width: 70%;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 18px 18px 18px 4px;
      padding: 12px 16px;
    }

    .message-row.outgoing .message-bubble {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 18px 18px 4px 18px;
    }

    .message-row.system .message-bubble {
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 12px;
      max-width: 90%;
      text-align: center;
    }

    .sender {
      display: block;
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .content {
      color: #fff;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      word-wrap: break-word;
    }

    .time {
      display: block;
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      margin-top: 6px;
    }

    .message-row.outgoing .time {
      color: rgba(255, 255, 255, 0.6);
    }

    .typing-row {
      display: flex;
    }

    .typing-bubble {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 18px;
      padding: 16px 20px;
    }

    .typing-bubble .dot {
      width: 8px;
      height: 8px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: typing 1.4s ease-in-out infinite;
    }

    .typing-bubble .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-bubble .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-6px);
        opacity: 1;
      }
    }

    /* Input Area */
    .input-area {
      display: flex;
      gap: 12px;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .message-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 14px 20px;
      font-size: 14px;
      color: #fff;
      transition: all 0.2s;
    }

    .message-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .message-input:focus {
      outline: none;
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }

    .send-btn {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .send-btn svg {
      width: 20px;
      height: 20px;
      color: #fff;
    }

    .closed-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px;
      background: rgba(34, 197, 94, 0.1);
      border-top: 1px solid rgba(34, 197, 94, 0.2);
      color: #22c55e;
      font-size: 14px;
      font-weight: 500;
    }

    .closed-banner svg {
      width: 20px;
      height: 20px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 100;
      backdrop-filter: blur(8px);
    }

    .review-modal {
      background: linear-gradient(145deg, #1a1a3e 0%, #0f0f23 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .modal-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    .modal-icon svg {
      width: 28px;
      height: 28px;
      color: #fff;
    }

    .review-modal h3 {
      color: #fff;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .review-modal p {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      margin-bottom: 24px;
    }

    .rating-container {
      margin-bottom: 24px;
    }

    .review-modal textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px;
      color: #fff;
      resize: none;
      font-family: inherit;
      margin-bottom: 24px;
    }

    .review-modal textarea::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .review-modal textarea:focus {
      outline: none;
      border-color: #6366f1;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
    }

    .skip-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .skip-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .submit-btn {
      flex: 1;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 12px;
      padding: 14px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: #fff;
      padding: 14px 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
      z-index: 200;
      animation: slideUp 0.3s ease-out;
    }

    .toast svg {
      width: 18px;
      height: 18px;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Scrollbar */
    .messages-area::-webkit-scrollbar {
      width: 6px;
    }

    .messages-area::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-area::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .messages-area::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class ChatInterfaceComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  departments: Department[] = [];
  chatSession?: ChatSession;
  messages: Message[] = [];

  customerName = '';
  customerEmail = '';
  selectedDepartmentId?: number;

  messageText = '';
  otherTyping = false;
  typingTimeout?: any;

  // Review properties
  showReviewModal = false;
  reviewRating = 0;
  reviewComment = '';
  isSubmittingReview = false;
  reviewSubmitted = false;

  // Queue status
  queueStatus?: QueueStatus;
  private queuePollInterval?: any;

  private wsSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
    this.stopQueuePolling();
  }

  startQueuePolling(): void {
    if (!this.chatSession) return;

    // Initial fetch
    this.fetchQueueStatus();

    // Poll every 5 seconds
    this.queuePollInterval = setInterval(() => {
      if (this.chatSession?.status === ChatStatus.WAITING) {
        this.fetchQueueStatus();
      } else {
        this.stopQueuePolling();
      }
    }, 5000);
  }

  stopQueuePolling(): void {
    if (this.queuePollInterval) {
      clearInterval(this.queuePollInterval);
      this.queuePollInterval = undefined;
    }
  }

  fetchQueueStatus(): void {
    if (!this.chatSession) return;

    this.apiService.getQueueStatus(this.chatSession.id).subscribe({
      next: (status) => {
        this.queueStatus = status;
      },
      error: (err) => {
        console.error('Failed to fetch queue status', err);
      }
    });
  }

  getDeptIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('sales')) return '💰';
    if (lower.includes('tech') || lower.includes('support')) return '🔧';
    if (lower.includes('billing') || lower.includes('payment')) return '💳';
    if (lower.includes('customer')) return '👋';
    if (lower.includes('general')) return '📋';
    return '💬';
  }

  loadDepartments(): void {
    this.apiService.getActiveDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (err) => {
        console.error('Failed to load departments', err);
      }
    });
  }

  selectDepartment(departmentId: number): void {
    this.selectedDepartmentId = this.selectedDepartmentId === departmentId ? undefined : departmentId;
  }

  startChat(): void {
    if (!this.customerName || !this.customerEmail) {
      return;
    }

    const chatData: ChatSessionCreate = {
      customer_name: this.customerName,
      customer_email: this.customerEmail,
      department_id: this.selectedDepartmentId
    };

    this.apiService.createChatSession(chatData).subscribe({
      next: (session) => {
        this.chatSession = session;
        this.loadMessages();
        this.connectWebSocket();
        // Start queue polling if in waiting status
        if (session.status === ChatStatus.WAITING) {
          this.startQueuePolling();
        }
      },
      error: (err) => {
        alert('Failed to start chat session');
        console.error(err);
      }
    });
  }

  loadMessages(): void {
    if (!this.chatSession) return;

    this.apiService.getChatMessages(this.chatSession.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to load messages', err);
      }
    });
  }

  connectWebSocket(): void {
    if (!this.chatSession) return;

    this.wsSubscription = this.wsService
      .connectToChat(this.chatSession.id, this.customerName)
      .subscribe({
        next: (wsMessage: WSMessage) => {
          this.handleWebSocketMessage(wsMessage);
        },
        error: (err) => {
          console.error('WebSocket error', err);
        }
      });
  }

  disconnectWebSocket(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.wsService.disconnect();
  }

  handleWebSocketMessage(wsMessage: any): void {
    if (wsMessage.type === 'message') {
      if (wsMessage.sender_name !== this.customerName) {
        const message: Message = {
          id: wsMessage.message_id || 0,
          chat_session_id: this.chatSession!.id,
          sender_name: wsMessage.sender_name || 'Agent',
          content: wsMessage.content || '',
          is_system_message: wsMessage.is_system_message || false,
          created_at: wsMessage.timestamp || new Date().toISOString()
        };
        this.messages.push(message);
        this.scrollToBottom();
      }
    } else if (wsMessage.type === 'typing') {
      if (wsMessage.sender_name !== this.customerName) {
        this.otherTyping = true;
        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }
        this.typingTimeout = setTimeout(() => {
          this.otherTyping = false;
        }, 3000);
      }
    } else if (wsMessage.type === 'system_message') {
      const message: Message = {
        id: 0,
        chat_session_id: this.chatSession!.id,
        sender_name: 'System',
        content: wsMessage.content || '',
        is_system_message: true,
        created_at: new Date().toISOString()
      };
      this.messages.push(message);
      this.scrollToBottom();
    } else if (wsMessage.type === 'agent_assigned') {
      // Agent has joined - update status and show system message
      this.chatSession!.status = ChatStatus.ACTIVE;
      this.stopQueuePolling();
      this.queueStatus = undefined;

      const message: Message = {
        id: 0,
        chat_session_id: this.chatSession!.id,
        sender_name: 'System',
        content: wsMessage.message || `${wsMessage.agent_name} has joined the chat.`,
        is_system_message: true,
        created_at: new Date().toISOString()
      };
      this.messages.push(message);
      this.scrollToBottom();
    } else if (wsMessage.type === 'queue_status') {
      // Update queue status from WebSocket
      this.queueStatus = {
        chat_session_id: wsMessage.chat_session_id,
        position: wsMessage.position,
        estimated_wait_minutes: wsMessage.estimated_wait_minutes,
        status: ChatStatus.WAITING,
        agents_available: 0,
        agents_busy: 0
      };
    } else if (wsMessage.type === 'chat_closed') {
      this.chatSession!.status = ChatStatus.CLOSED;
      this.stopQueuePolling();
      if (!this.reviewSubmitted) {
        setTimeout(() => {
          this.showReviewModal = true;
        }, 1000);
      }
    }
  }

  submitReview(): void {
    if (this.reviewRating === 0 || !this.chatSession) return;

    this.isSubmittingReview = true;

    const reviewData: ReviewCreate = {
      chat_session_id: this.chatSession.id,
      rating: this.reviewRating,
      comment: this.reviewComment.trim() || undefined
    };

    this.apiService.submitReview(reviewData).subscribe({
      next: () => {
        this.showReviewModal = false;
        this.reviewSubmitted = true;
        this.isSubmittingReview = false;
      },
      error: (err) => {
        console.error('Failed to submit review', err);
        this.isSubmittingReview = false;
        this.showReviewModal = false;
      }
    });
  }

  skipReview(): void {
    this.showReviewModal = false;
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.chatSession) {
      return;
    }

    const messageData: MessageCreate = {
      chat_session_id: this.chatSession.id,
      sender_name: this.customerName,
      content: this.messageText
    };

    this.apiService.sendMessage(messageData).subscribe({
      next: (message) => {
        this.messages.push(message);
        this.messageText = '';
        this.scrollToBottom();
      },
      error: (err) => {
        alert('Failed to send message');
        console.error(err);
      }
    });
  }

  onTyping(): void {
    if (this.chatSession) {
      this.wsService.sendTypingIndicator(this.chatSession.id, true);
    }
  }

  endChat(): void {
    if (!this.chatSession) return;

    if (confirm('Are you sure you want to end this chat?')) {
      this.apiService.closeChat(this.chatSession.id).subscribe({
        next: (session) => {
          this.chatSession = session;
          this.disconnectWebSocket();
          if (!this.reviewSubmitted) {
            setTimeout(() => {
              this.showReviewModal = true;
            }, 500);
          }
        },
        error: (err) => {
          alert('Failed to close chat');
          console.error(err);
        }
      });
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
