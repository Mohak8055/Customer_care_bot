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
    <div class="chat-app-container">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-grid"></div>

      <div class="view-welcome" *ngIf="!chatSession">
        <div class="glass-card welcome-card">
          <div class="brand-header">
            <div class="logo-container">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h1>Support Portal</h1>
            <p>Connect with our team in seconds.</p>
          </div>

          <form (ngSubmit)="startChat()" class="welcome-form">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" [(ngModel)]="customerName" name="customerName" placeholder="e.g. Alex Smith" required>
            </div>

            <div class="form-group">
              <label>Email Address</label>
              <input type="email" [(ngModel)]="customerEmail" name="customerEmail" placeholder="name@company.com" required>
            </div>

            <div class="form-group" *ngIf="departments.length > 0">
              <label>Department</label>
              <div class="dept-selector">
                <div
                  *ngFor="let dept of departments"
                  class="dept-chip"
                  [class.selected]="selectedDepartmentId === dept.id"
                  (click)="selectDepartment(dept.id)"
                >
                  <span class="dept-icon">{{ getDeptIcon(dept.name) }}</span>
                  {{ dept.name }}
                </div>
              </div>
            </div>

            <button type="submit" class="btn-primary" [disabled]="!customerName || !customerEmail">
              Start Conversation
              <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        </div>
      </div>

      <div class="view-waiting" *ngIf="chatSession && chatSession.status === 'waiting'">
        <div class="radar-container">
          <div class="radar-circle ring-1"></div>
          <div class="radar-circle ring-2"></div>
          <div class="radar-circle ring-3"></div>
          <div class="radar-scan"></div>
          <div class="radar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>

        <div class="waiting-content">
          <h2>Finding an Agent</h2>
          <p class="status-text">
            <ng-container *ngIf="!queueStatus || queueStatus.position === 0">
              Connecting you to the best available support...
            </ng-container>
            <ng-container *ngIf="queueStatus && queueStatus.position > 0">
              All agents are busy. You are <span class="highlight">#{{ queueStatus.position }}</span> in line.
            </ng-container>
          </p>
          
          <div class="wait-time-pill" *ngIf="queueStatus?.estimated_wait_minutes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Est. wait: {{ queueStatus!.estimated_wait_minutes }} min</span>
          </div>

          <button class="btn-text" (click)="endChat()">Cancel Request</button>
        </div>
      </div>

      <div class="view-chat" *ngIf="chatSession && chatSession.status !== 'waiting'">
        <header class="chat-header glass-panel">
          <div class="agent-info">
            <div class="agent-avatar">
              {{ (chatSession.assigned_agent?.full_name || 'A')[0].toUpperCase() }}
              <div class="status-badge" [class.online]="chatSession.status === 'active'"></div>
            </div>
            <div class="text-info">
              <h3>{{ chatSession.assigned_agent?.full_name || 'Support Agent' }}</h3>
              <span class="sub-text">{{ chatSession.department?.name || 'Customer Support' }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn-icon" (click)="endChat()" title="End Chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
            </button>
          </div>
        </header>

        <main class="chat-viewport" #messagesContainer>
          <div class="messages-list">
            <div class="system-divider">
              <span>Chat Started {{ formatTime(chatSession.created_at) }}</span>
            </div>

            <div
              *ngFor="let msg of messages"
              class="message-wrapper"
              [class.mine]="msg.sender_name === customerName"
              [class.theirs]="msg.sender_name !== customerName && !msg.is_system_message"
              [class.system]="msg.is_system_message"
            >
              <div class="message-bubble">
                <div class="sender-name" *ngIf="msg.sender_name !== customerName && !msg.is_system_message">
                  {{ msg.sender_name }}
                </div>
                <div class="content">{{ msg.content }}</div>
                <div class="timestamp">{{ formatTime(msg.created_at) }}</div>
              </div>
            </div>

            <div class="message-wrapper theirs typing-wrapper" *ngIf="otherTyping">
              <div class="message-bubble typing-bubble">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
              </div>
            </div>
          </div>
        </main>

        <footer class="chat-input-area glass-panel" *ngIf="chatSession.status !== 'closed'">
          <div class="input-capsule">
            <input
              type="text"
              [(ngModel)]="messageText"
              (keyup.enter)="sendMessage()"
              (keyup)="onTyping()"
              placeholder="Type your message..."
            />
            <button class="btn-send" (click)="sendMessage()" [disabled]="!messageText.trim()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </footer>

        <div class="chat-closed-overlay" *ngIf="chatSession.status === 'closed' && !showReviewModal">
          <div class="closed-content">
            <div class="icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3>Conversation Ended</h3>
            <p>Thank you for contacting support.</p>
            <button class="btn-primary small" (click)="chatSession = undefined; messages = []">Start New Chat</button>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" *ngIf="showReviewModal">
        <div class="glass-card review-card">
          <div class="review-header">
            <h3>Rate your experience</h3>
            <p>How did {{ chatSession?.assigned_agent?.full_name || 'we' }} do today?</p>
          </div>
          
          <div class="star-wrapper">
            <app-star-rating
              [rating]="reviewRating"
              (ratingChange)="reviewRating = $event"
              [showText]="true"
            ></app-star-rating>
          </div>

          <textarea 
            [(ngModel)]="reviewComment" 
            placeholder="Any additional feedback? (Optional)"
            rows="3"
          ></textarea>

          <div class="review-actions">
            <button class="btn-text" (click)="skipReview()">Skip</button>
            <button class="btn-primary" (click)="submitReview()" [disabled]="reviewRating === 0 || isSubmittingReview">
              {{ isSubmittingReview ? 'Sending...' : 'Submit Review' }}
            </button>
          </div>
        </div>
      </div>
      
      <div class="toast-notification" [class.show]="reviewSubmitted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Feedback submitted successfully!
      </div>
    </div>
  `,
  styles: [`
    /* --- CORE VARIABLES & RESET --- */
    :host {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --bg-dark: #0f172a;
      --glass-bg: rgba(255, 255, 255, 0.05);
      --glass-border: rgba(255, 255, 255, 0.1);
      --text-main: #ffffff;
      --text-muted: #94a3b8;
      --mine-bg: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --theirs-bg: rgba(255, 255, 255, 0.08);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .chat-app-container {
      position: relative;
      width: 100%;
      height: 100vh;
      background: var(--bg-dark);
      overflow: hidden;
      color: var(--text-main);
      display: flex;
      flex-direction: column;
    }

    /* --- BACKGROUND EFFECTS --- */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(var(--glass-border) 1px, transparent 1px),
        linear-gradient(90deg, var(--glass-border) 1px, transparent 1px);
      background-size: 50px 50px;
      opacity: 0.1;
      pointer-events: none;
    }

    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.4;
      animation: float 20s infinite ease-in-out;
      pointer-events: none;
    }

    .orb-1 { width: 400px; height: 400px; background: #6366f1; top: -100px; left: -100px; }
    .orb-2 { width: 300px; height: 300px; background: #ec4899; bottom: -50px; right: -50px; animation-delay: -10s; }

    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(30px, 50px); }
    }

    /* --- GLASS COMPONENTS --- */
    .glass-card, .glass-panel {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* --- WELCOME VIEW --- */
    .view-welcome {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 10;
    }

    .welcome-card {
      width: 100%;
      max-width: 420px;
      border-radius: 24px;
      padding: 40px;
      animation: slideUp 0.5s ease-out;
    }

    .brand-header { text-align: center; margin-bottom: 32px; }
    .logo-container {
      width: 64px; height: 64px;
      background: var(--mine-bg);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
    }
    .logo-container svg { width: 32px; height: 32px; color: white; }
    .brand-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .brand-header p { color: var(--text-muted); font-size: 15px; }

    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; color: var(--text-muted); font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 14px 16px;
      color: white;
      font-size: 15px;
      transition: all 0.2s;
    }
    .form-group input:focus { outline: none; border-color: var(--primary); background: rgba(99, 102, 241, 0.1); }

    .dept-selector { display: flex; flex-wrap: wrap; gap: 8px; }
    .dept-chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 6px;
    }
    .dept-chip:hover { background: rgba(255,255,255,0.1); }
    .dept-chip.selected { background: var(--primary); border-color: var(--primary); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

    .btn-primary {
      width: 100%;
      background: var(--mine-bg);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: all 0.2s;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary.small { width: auto; padding: 10px 24px; font-size: 14px; }
    .arrow-icon { width: 18px; height: 18px; }

    /* --- WAITING VIEW --- */
    .view-waiting {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .radar-container { position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 40px; }
    .radar-circle { position: absolute; border-radius: 50%; border: 1px solid var(--primary); opacity: 0; animation: ripple 3s infinite cubic-bezier(0.4, 0, 0.2, 1); }
    .ring-1 { width: 100%; height: 100%; animation-delay: 0s; }
    .ring-2 { width: 100%; height: 100%; animation-delay: 1s; }
    .ring-3 { width: 100%; height: 100%; animation-delay: 2s; }
    .radar-icon { z-index: 2; color: white; background: var(--primary); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px var(--primary); }
    .radar-icon svg { width: 28px; height: 28px; }
    
    @keyframes ripple {
      0% { width: 20%; height: 20%; opacity: 0.8; border-width: 3px; }
      100% { width: 100%; height: 100%; opacity: 0; border-width: 0px; }
    }

    .waiting-content { text-align: center; max-width: 400px; }
    .waiting-content h2 { font-size: 24px; margin-bottom: 12px; }
    .status-text { color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
    .highlight { color: var(--primary); font-weight: 700; font-size: 1.1em; }
    
    .wait-time-pill {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      padding: 8px 16px; border-radius: 20px; font-size: 13px; color: #fbbf24;
      margin-bottom: 32px;
    }
    .wait-time-pill svg { width: 16px; height: 16px; }

    .btn-text { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; text-decoration: underline; }
    .btn-text:hover { color: white; }

    /* --- CHAT VIEW --- */
    .view-chat { flex: 1; display: flex; flex-direction: column; max-width: 1200px; margin: 0 auto; width: 100%; position: relative; z-index: 10; }
    
    .chat-header {
      padding: 16px 24px;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid var(--glass-border);
    }
    .agent-info { display: flex; align-items: center; gap: 12px; }
    .agent-avatar {
      width: 42px; height: 42px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 700; position: relative; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
    }
    .status-badge { width: 10px; height: 10px; background: #ef4444; border: 2px solid var(--bg-dark); border-radius: 50%; position: absolute; bottom: 0; right: 0; }
    .status-badge.online { background: #22c55e; }
    .text-info h3 { font-size: 16px; font-weight: 600; margin: 0; }
    .sub-text { font-size: 12px; color: var(--text-muted); }
    
    .btn-icon { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 12px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .btn-icon:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .btn-icon svg { width: 20px; height: 20px; }

    .chat-viewport { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; }
    .messages-list { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; padding-bottom: 10px; }
    
    .system-divider { text-align: center; margin: 20px 0; opacity: 0.5; font-size: 12px; position: relative; }
    .system-divider::before { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: var(--glass-border); z-index: 0; }
    .system-divider span { background: var(--bg-dark); padding: 0 10px; position: relative; z-index: 1; }

    .message-wrapper { display: flex; margin-bottom: 16px; animation: slideIn 0.3s ease-out; }
    .message-wrapper.mine { justify-content: flex-end; }
    .message-wrapper.theirs { justify-content: flex-start; }
    .message-wrapper.system { justify-content: center; }

    .message-bubble {
      max-width: 70%; padding: 12px 18px; border-radius: 20px; position: relative;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .mine .message-bubble {
      background: var(--mine-bg);
      color: white;
      border-radius: 20px 20px 4px 20px;
    }
    .theirs .message-bubble {
      background: var(--theirs-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-main);
      border-radius: 20px 20px 20px 4px;
    }
    .system .message-bubble {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      font-size: 13px;
      padding: 6px 12px;
      border-radius: 12px;
    }
    
    .sender-name { font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: 600; }
    .content { line-height: 1.5; font-size: 15px; word-wrap: break-word; }
    .timestamp { font-size: 10px; opacity: 0.5; margin-top: 4px; text-align: right; }
    
    /* Typing Animation */
    .typing-wrapper { margin-bottom: 8px; }
    .typing-bubble { padding: 12px 16px; display: flex; gap: 4px; align-items: center; min-width: 60px; }
    .dot { width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    .chat-input-area { padding: 20px; }
    .input-capsule {
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      border-radius: 30px; padding: 6px 6px 6px 20px;
      display: flex; align-items: center; gap: 10px;
      transition: all 0.2s;
    }
    .input-capsule:focus-within { border-color: var(--primary); background: rgba(255,255,255,0.08); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
    .input-capsule input { background: none; border: none; flex: 1; color: white; font-size: 15px; padding: 8px 0; }
    .input-capsule input:focus { outline: none; }
    
    .btn-send {
      width: 42px; height: 42px; border-radius: 50%; border: none;
      background: var(--mine-bg); color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-send:hover:not(:disabled) { transform: scale(1.1) rotate(-10deg); }
    .btn-send:disabled { opacity: 0.5; background: #334155; cursor: not-allowed; }
    .btn-send svg { width: 18px; height: 18px; margin-left: -2px; margin-top: 2px; }

    /* --- CLOSED OVERLAY --- */
    .chat-closed-overlay {
      position: absolute; bottom: 80px; left: 0; right: 0;
      display: flex; justify-content: center;
      animation: slideUp 0.3s ease-out;
    }
    .closed-content {
      background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      padding: 20px 30px; border-radius: 16px;
      text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .icon-box { width: 40px; height: 40px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
    .closed-content h3 { font-size: 16px; margin-bottom: 4px; }
    .closed-content p { color: var(--text-muted); font-size: 13px; margin-bottom: 12px; }

    /* --- REVIEW MODAL --- */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
      z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .review-card {
      width: 100%; max-width: 400px; padding: 30px; border-radius: 24px; text-align: center;
    }
    .review-header h3 { font-size: 22px; margin-bottom: 8px; }
    .star-wrapper { margin: 24px 0; display: flex; justify-content: center; }
    .review-card textarea {
      width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      border-radius: 12px; padding: 12px; color: white; margin-bottom: 24px; resize: none;
    }
    .review-actions { display: flex; gap: 12px; justify-content: flex-end; }

    /* --- TOAST --- */
    .toast-notification {
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px);
      background: #10b981; color: white; padding: 12px 24px; border-radius: 30px;
      display: flex; align-items: center; gap: 8px; font-weight: 600;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 200;
    }
    .toast-notification.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .toast-notification svg { width: 18px; height: 18px; }

    /* Scrollbar */
    .chat-viewport::-webkit-scrollbar { width: 6px; }
    .chat-viewport::-webkit-scrollbar-track { background: transparent; }
    .chat-viewport::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    .chat-viewport::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
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
    if (lower.includes('customer')) return '🤝';
    if (lower.includes('general')) return 'ℹ️';
    return '🏢';
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