import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import {
  ChatSession,
  Message,
  MessageCreate,
  WSMessage,
  ChatStatus,
  AgentStatus,
  AuthUser,
  Department,
  TransferRequest,
  IncomingAssignment
} from '../../models/models';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="agent-dashboard">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-brand">
            <div class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <h1>Agent Dashboard</h1>
              <p>{{ currentUser?.department_id ? 'Department Agent' : 'Support Agent' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <div class="status-toggle">
              <span class="status-dot" [class]="currentStatus"></span>
              <select [(ngModel)]="currentStatus" (change)="updateStatus()">
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div class="user-badge">
              <div class="avatar">{{ getInitials(currentUser?.full_name || currentUser?.username || 'A') }}</div>
              <span>{{ currentUser?.full_name || currentUser?.username }}</span>
            </div>
            <button class="btn-logout" (click)="logout()">Logout</button>
          </div>
        </div>
      </header>

      <div class="dashboard-content">
        <!-- Sidebar - Chat List -->
        <aside class="chat-sidebar">
          <div class="sidebar-section">
            <div class="section-header">
              <h3>Active Chats</h3>
              <span class="badge">{{ activeChats.length }}</span>
            </div>
            <div class="chat-list">
              <div
                *ngFor="let chat of activeChats"
                class="chat-item"
                [class.selected]="selectedChat?.id === chat.id"
                (click)="selectChat(chat)"
              >
                <div class="chat-avatar">{{ getInitials(chat.customer_name) }}</div>
                <div class="chat-details">
                  <div class="chat-name">{{ chat.customer_name }}</div>
                  <div class="chat-meta">{{ chat.department?.name }}</div>
                </div>
                <span class="status-indicator active"></span>
              </div>
              <div *ngIf="activeChats.length === 0" class="empty-state">
                <span>No active chats</span>
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="section-header">
              <h3>Waiting Queue</h3>
              <span class="badge warning">{{ waitingChats.length }}</span>
            </div>
            <div class="chat-list">
              <div
                *ngFor="let chat of waitingChats"
                class="chat-item waiting"
              >
                <div class="chat-avatar waiting">{{ getInitials(chat.customer_name) }}</div>
                <div class="chat-details">
                  <div class="chat-name">{{ chat.customer_name }}</div>
                  <div class="chat-meta">{{ chat.department?.name }} - {{ getTimeAgo(chat.created_at) }}</div>
                </div>
                <button
                  class="btn-claim"
                  (click)="claimChat(chat); $event.stopPropagation()"
                  [disabled]="activeChats.length > 0"
                  [title]="activeChats.length > 0 ? 'Close your current chat first' : 'Claim this chat'"
                >Claim</button>
              </div>
              <div *ngIf="waitingChats.length === 0" class="empty-state">
                <span>Queue is empty</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="chat-main">
          <div *ngIf="!selectedChat" class="no-chat-selected">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2>Select a conversation</h2>
            <p>Choose a chat from the sidebar or claim one from the queue</p>
          </div>

          <div *ngIf="selectedChat" class="chat-container">
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-header-info">
                <div class="chat-avatar large">{{ getInitials(selectedChat.customer_name) }}</div>
                <div>
                  <h2>{{ selectedChat.customer_name }}</h2>
                  <p>{{ selectedChat.customer_email }} | {{ selectedChat.department?.name }}</p>
                </div>
              </div>
              <div class="chat-header-actions" *ngIf="selectedChat.status !== 'closed'">
                <button class="btn btn-transfer" (click)="openTransferModal()">Transfer</button>
                <button class="btn btn-close-chat" (click)="closeChat()">Close Chat</button>
              </div>
            </div>

            <!-- Messages -->
            <div class="messages-area" #messagesContainer>
              <div
                *ngFor="let msg of messages"
                class="message-row"
                [class.outgoing]="msg.sender_name !== selectedChat.customer_name && !msg.is_system_message"
                [class.system]="msg.is_system_message"
              >
                <div class="message-bubble">
                  <span class="sender" *ngIf="!msg.is_system_message">{{ msg.sender_name }}</span>
                  <p class="content">{{ msg.content }}</p>
                  <span class="time">{{ formatTime(msg.created_at) }}</span>
                </div>
              </div>

              <div class="typing-row" *ngIf="customerTyping">
                <div class="typing-bubble">
                  <span>Customer is typing</span>
                  <div class="dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            </div>

            <!-- Input Area -->
            <div class="input-area" *ngIf="selectedChat.status !== 'closed'">
              <input
                type="text"
                [(ngModel)]="messageText"
                (keyup.enter)="sendMessage()"
                placeholder="Type your response..."
                class="message-input"
              />
              <button class="send-btn" (click)="sendMessage()" [disabled]="!messageText.trim()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            <div class="closed-banner" *ngIf="selectedChat.status === 'closed'">
              This conversation has been closed
            </div>
          </div>
        </main>
      </div>

      <!-- Transfer Modal -->
      <div class="modal-overlay" *ngIf="showTransferModal" (click)="showTransferModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Transfer Chat</h3>
            <button class="modal-close" (click)="showTransferModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Select Department</label>
              <select [(ngModel)]="transferDepartmentId" class="form-select">
                <option [ngValue]="null" disabled>-- Select Department --</option>
                <option *ngFor="let dept of departments" [ngValue]="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Reason (optional)</label>
              <textarea [(ngModel)]="transferReason" placeholder="Enter transfer reason..." rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showTransferModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="transferChat()" [disabled]="!transferDepartmentId">Transfer</button>
          </div>
        </div>
      </div>

      <!-- Incoming Assignment Notification (only show if no active chats) -->
      <div class="incoming-notification" *ngIf="incomingAssignment && activeChats.length === 0">
        <div class="notification-content">
          <div class="notification-icon pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="notification-info">
            <h4>New Customer Waiting</h4>
            <p>{{ incomingAssignment.customer_name }}</p>
            <span class="notification-email">{{ incomingAssignment.customer_email }}</span>
          </div>
          <div class="notification-timer">
            <div class="timer-circle">
              <svg viewBox="0 0 36 36">
                <circle class="timer-bg" cx="18" cy="18" r="16"></circle>
                <circle class="timer-progress" cx="18" cy="18" r="16"
                  [style.stroke-dashoffset]="100 - (assignmentCountdown / 10 * 100)"></circle>
              </svg>
              <span class="timer-text">{{ assignmentCountdown }}</span>
            </div>
          </div>
          <div class="notification-actions">
            <button class="btn-accept" (click)="acceptIncomingAssignment()">Accept</button>
            <button class="btn-decline" (click)="declineIncomingAssignment()">Decline</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .agent-dashboard {
      height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
      display: flex;
      flex-direction: column;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .dashboard-header {
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon svg { width: 20px; height: 20px; }

    .header-brand h1 { font-size: 18px; font-weight: 600; }
    .header-brand p { font-size: 12px; opacity: 0.6; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px 14px;
      border-radius: 20px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6b7280;
    }

    .status-dot.available { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
    .status-dot.busy { background: #f59e0b; }
    .status-dot.offline { background: #ef4444; }

    .status-toggle select {
      background: transparent;
      border: none;
      color: white;
      font-size: 13px;
      cursor: pointer;
    }

    .status-toggle select option { background: #1a1a3e; }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      font-size: 14px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
    }

    .btn-logout {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-logout:hover { background: rgba(239, 68, 68, 0.2); }

    .dashboard-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      flex: 1;
      overflow: hidden;
    }

    .chat-sidebar {
      background: rgba(255, 255, 255, 0.02);
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      overflow-y: auto;
      padding: 16px;
    }

    .sidebar-section { margin-bottom: 24px; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
    }

    .section-header h3 {
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge.warning {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .chat-list { display: flex; flex-direction: column; gap: 6px; }

    .chat-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .chat-item:hover { background: rgba(255, 255, 255, 0.06); }
    .chat-item.selected {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .chat-item.waiting {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.2);
    }

    .chat-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      color: white;
      flex-shrink: 0;
    }

    .chat-avatar.waiting { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .chat-avatar.large { width: 44px; height: 44px; font-size: 14px; }

    .chat-details { flex: 1; min-width: 0; }

    .chat-name {
      color: white;
      font-weight: 500;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-meta {
      color: rgba(255, 255, 255, 0.4);
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }

    .btn-claim {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .btn-claim:disabled {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
    }

    .empty-state {
      text-align: center;
      padding: 24px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 13px;
    }

    .chat-main {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.01);
      overflow: hidden;
    }

    .no-chat-selected {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.4);
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .empty-icon svg { width: 36px; height: 36px; opacity: 0.5; }

    .no-chat-selected h2 { font-size: 18px; font-weight: 500; margin-bottom: 6px; }
    .no-chat-selected p { font-size: 14px; }

    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chat-header-info h2 { color: white; font-size: 16px; font-weight: 600; }
    .chat-header-info p { color: rgba(255, 255, 255, 0.5); font-size: 12px; margin-top: 2px; }

    .chat-header-actions { display: flex; gap: 8px; }

    .btn {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .btn-transfer {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
    }

    .btn-transfer:hover { background: rgba(99, 102, 241, 0.2); }

    .btn-close-chat {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .btn-close-chat:hover { background: rgba(239, 68, 68, 0.2); }

    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message-row { display: flex; }
    .message-row.outgoing { justify-content: flex-end; }
    .message-row.system { justify-content: center; }

    .message-bubble {
      max-width: 65%;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 16px 16px 16px 4px;
      padding: 10px 14px;
    }

    .message-row.outgoing .message-bubble {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 16px 16px 4px 16px;
    }

    .message-row.system .message-bubble {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 10px;
      max-width: 80%;
      text-align: center;
    }

    .sender {
      display: block;
      color: rgba(255, 255, 255, 0.5);
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .content {
      color: white;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .time {
      display: block;
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      margin-top: 4px;
    }

    .message-row.outgoing .time { color: rgba(255, 255, 255, 0.6); }

    .typing-row { display: flex; }

    .typing-bubble {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 10px 14px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
    }

    .dots { display: flex; gap: 3px; }

    .dots span {
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }

    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .input-area {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .message-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 12px 18px;
      font-size: 14px;
      color: white;
    }

    .message-input::placeholder { color: rgba(255, 255, 255, 0.3); }
    .message-input:focus { outline: none; border-color: #6366f1; }

    .send-btn {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .send-btn:hover:not(:disabled) { transform: scale(1.05); }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn svg { width: 18px; height: 18px; color: white; }

    .closed-banner {
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border-top: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      text-align: center;
      font-size: 14px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: #1a1a3e;
      border-radius: 16px;
      width: 90%;
      max-width: 420px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .modal-header h3 { color: white; font-size: 16px; }

    .modal-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
    }

    .modal-body { padding: 20px; }

    .form-group { margin-bottom: 16px; }

    .form-group label {
      display: block;
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .form-select, .modal textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px 12px;
      color: white;
      font-size: 14px;
    }

    .form-select option { background: #1a1a3e; }
    .modal textarea { resize: vertical; font-family: inherit; }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      color: white;
    }

    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

    .messages-area::-webkit-scrollbar { width: 6px; }
    .messages-area::-webkit-scrollbar-track { background: transparent; }
    .messages-area::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }

    /* Incoming Assignment Notification */
    .incoming-notification {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .notification-content {
      background: linear-gradient(145deg, #1a1a3e 0%, #0f0f23 100%);
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 197, 94, 0.2);
      min-width: 400px;
    }

    .notification-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-icon.pulse {
      animation: iconPulse 2s infinite;
    }

    @keyframes iconPulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
      70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    .notification-icon svg { width: 24px; height: 24px; color: white; }

    .notification-info { flex: 1; }
    .notification-info h4 { color: #22c55e; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .notification-info p { color: white; font-size: 15px; font-weight: 500; }
    .notification-email { color: rgba(255, 255, 255, 0.5); font-size: 12px; }

    .notification-timer { flex-shrink: 0; }

    .timer-circle {
      position: relative;
      width: 44px;
      height: 44px;
    }

    .timer-circle svg {
      transform: rotate(-90deg);
      width: 44px;
      height: 44px;
    }

    .timer-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 3;
    }

    .timer-progress {
      fill: none;
      stroke: #22c55e;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 100;
      transition: stroke-dashoffset 0.3s linear;
    }

    .timer-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 14px;
      font-weight: 600;
    }

    .notification-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-accept {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border: none;
      color: white;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-accept:hover { transform: scale(1.02); }

    .btn-decline {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-decline:hover { background: rgba(239, 68, 68, 0.2); }
  `]
})
export class AgentDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  currentUser: AuthUser | null = null;
  currentStatus: AgentStatus = AgentStatus.AVAILABLE;

  activeChats: ChatSession[] = [];
  waitingChats: ChatSession[] = [];
  selectedChat: ChatSession | null = null;
  messages: Message[] = [];
  departments: Department[] = [];

  messageText = '';
  customerTyping = false;
  typingTimeout?: any;

  showTransferModal = false;
  transferDepartmentId: number | null = null;
  transferReason = '';

  // Incoming assignment notification
  incomingAssignment?: IncomingAssignment;
  assignmentCountdown = 10;
  private assignmentTimerInterval?: any;

  private wsSubscription?: Subscription;
  private agentWsSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDepartments();
    this.loadChats();
    this.connectAgentWebSocket();

    // Refresh chats every 3 seconds for real-time queue updates
    this.refreshSubscription = interval(3000).subscribe(() => {
      this.loadChats();
    });
  }

  connectAgentWebSocket(): void {
    if (!this.currentUser) return;

    this.agentWsSubscription = this.wsService
      .connectAgent(this.currentUser.id, this.currentUser.department_id)
      .subscribe({
        next: (wsMessage: any) => this.handleAgentWebSocketMessage(wsMessage),
        error: (err) => console.error('Agent WebSocket error', err)
      });
  }

  handleAgentWebSocketMessage(wsMessage: any): void {
    if (wsMessage.type === 'incoming_assignment') {
      // Only show notification if agent has no active chats
      if (this.activeChats.length > 0) {
        console.log('Ignoring incoming assignment - agent has active chat');
        return;
      }

      // Show incoming assignment notification
      this.incomingAssignment = {
        type: wsMessage.type,
        chat_session_id: wsMessage.chat_session_id,
        customer_name: wsMessage.customer_name,
        customer_email: wsMessage.customer_email,
        timeout_seconds: wsMessage.timeout_seconds || 10,
        message: wsMessage.message
      };
      this.startAssignmentCountdown();
    } else if (wsMessage.type === 'new_assignment') {
      // Direct assignment - reload chats
      this.loadChats();
    }
  }

  startAssignmentCountdown(): void {
    this.assignmentCountdown = 10;
    this.clearAssignmentTimer();

    this.assignmentTimerInterval = setInterval(() => {
      this.assignmentCountdown--;
      if (this.assignmentCountdown <= 0) {
        // Auto-decline when timer runs out
        this.declineIncomingAssignment();
      }
    }, 1000);
  }

  clearAssignmentTimer(): void {
    if (this.assignmentTimerInterval) {
      clearInterval(this.assignmentTimerInterval);
      this.assignmentTimerInterval = undefined;
    }
  }

  acceptIncomingAssignment(): void {
    if (!this.incomingAssignment || !this.currentUser) return;

    this.clearAssignmentTimer();
    const chatId = this.incomingAssignment.chat_session_id;

    this.apiService.acceptAssignment(chatId, this.currentUser.id).subscribe({
      next: (chat) => {
        this.incomingAssignment = undefined;
        this.selectedChat = chat;
        this.loadMessages();
        this.connectWebSocket();
        this.loadChats();
      },
      error: (err) => {
        console.error('Failed to accept assignment', err);
        this.incomingAssignment = undefined;
        alert('Failed to accept assignment. It may have been claimed by another agent.');
        this.loadChats();
      }
    });
  }

  declineIncomingAssignment(): void {
    if (!this.incomingAssignment || !this.currentUser) {
      this.incomingAssignment = undefined;
      this.clearAssignmentTimer();
      return;
    }

    this.clearAssignmentTimer();
    const chatId = this.incomingAssignment.chat_session_id;

    this.apiService.declineAssignment(chatId, this.currentUser.id).subscribe({
      next: () => {
        this.incomingAssignment = undefined;
        this.currentStatus = AgentStatus.OFFLINE;
        this.loadChats();
      },
      error: (err) => {
        console.error('Failed to decline assignment', err);
        this.incomingAssignment = undefined;
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
    this.agentWsSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.clearAssignmentTimer();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  loadDepartments(): void {
    this.apiService.getDepartments().subscribe({
      next: (depts) => this.departments = depts,
      error: (err) => console.error('Failed to load departments', err)
    });
  }

  loadChats(): void {
    if (!this.currentUser) return;

    // Load active chats assigned to this agent
    this.apiService.getChatSessions({ agent_id: this.currentUser.id }).subscribe({
      next: (chats) => {
        this.activeChats = chats.filter(c => c.status === ChatStatus.ACTIVE);
        // Update selected chat if it changed
        if (this.selectedChat) {
          const updated = chats.find(c => c.id === this.selectedChat!.id);
          if (updated) this.selectedChat = updated;
        }
      },
      error: (err) => console.error('Failed to load active chats', err)
    });

    // Load waiting chats - for agent's department or all if admin
    const params: any = { status_filter: ChatStatus.WAITING };
    if (this.currentUser.department_id && this.currentUser.role !== 'admin') {
      params.department_id = this.currentUser.department_id;
    }

    this.apiService.getChatSessions(params).subscribe({
      next: (chats) => {
        this.waitingChats = chats;
      },
      error: (err) => console.error('Failed to load waiting chats', err)
    });
  }

  selectChat(chat: ChatSession): void {
    this.selectedChat = chat;
    this.loadMessages();
    this.connectWebSocket();
  }

  claimChat(chat: ChatSession): void {
    if (!this.currentUser) return;

    this.apiService.claimChat(chat.id, this.currentUser.id).subscribe({
      next: (updatedChat) => {
        this.selectedChat = updatedChat;
        this.loadMessages();
        this.connectWebSocket();
        this.loadChats(); // Refresh lists
      },
      error: (err) => {
        console.error('Failed to claim chat', err);
        alert('Failed to claim chat. It may have been claimed by another agent.');
        this.loadChats();
      }
    });
  }

  loadMessages(): void {
    if (!this.selectedChat) return;

    this.apiService.getChatMessages(this.selectedChat.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.scrollToBottom();
      },
      error: (err) => console.error('Failed to load messages', err)
    });
  }

  connectWebSocket(): void {
    if (!this.selectedChat || !this.currentUser) return;

    this.disconnectWebSocket();

    const senderName = this.currentUser.full_name || this.currentUser.username;
    this.wsSubscription = this.wsService
      .connectToChat(this.selectedChat.id, senderName, this.currentUser.id)
      .subscribe({
        next: (wsMessage: WSMessage) => this.handleWebSocketMessage(wsMessage),
        error: (err) => console.error('WebSocket error', err)
      });
  }

  disconnectWebSocket(): void {
    this.wsSubscription?.unsubscribe();
    this.wsService.disconnect();
  }

  handleWebSocketMessage(wsMessage: WSMessage): void {
    const senderName = this.currentUser?.full_name || this.currentUser?.username;

    if (wsMessage.type === 'message' && wsMessage.sender_name !== senderName) {
      const message: Message = {
        id: wsMessage.message_id || 0,
        chat_session_id: this.selectedChat!.id,
        sender_name: wsMessage.sender_name || 'Customer',
        content: wsMessage.content || '',
        is_system_message: wsMessage.is_system_message || false,
        created_at: wsMessage.timestamp || new Date().toISOString()
      };
      this.messages.push(message);
      this.scrollToBottom();
    } else if (wsMessage.type === 'system_message') {
      const message: Message = {
        id: 0,
        chat_session_id: this.selectedChat!.id,
        sender_name: 'System',
        content: wsMessage.content || '',
        is_system_message: true,
        created_at: new Date().toISOString()
      };
      this.messages.push(message);
      this.scrollToBottom();
    } else if (wsMessage.type === 'typing' && wsMessage.sender_name !== senderName) {
      this.customerTyping = true;
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => this.customerTyping = false, 3000);
    } else if (wsMessage.type === 'chat_closed') {
      if (this.selectedChat) {
        this.selectedChat.status = ChatStatus.CLOSED;
      }
      this.loadChats();
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.selectedChat || !this.currentUser) return;

    const messageData: MessageCreate = {
      chat_session_id: this.selectedChat.id,
      sender_id: this.currentUser.id,
      sender_name: this.currentUser.full_name || this.currentUser.username,
      content: this.messageText
    };

    this.apiService.sendMessage(messageData).subscribe({
      next: (message) => {
        this.messages.push(message);
        this.messageText = '';
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to send message', err);
        alert('Failed to send message');
      }
    });
  }

  closeChat(): void {
    if (!this.selectedChat) return;

    if (confirm('Are you sure you want to close this chat?')) {
      this.apiService.closeChat(this.selectedChat.id).subscribe({
        next: (session) => {
          this.selectedChat = session;
          this.loadChats();
        },
        error: (err) => {
          console.error('Failed to close chat', err);
          alert('Failed to close chat');
        }
      });
    }
  }

  openTransferModal(): void {
    this.showTransferModal = true;
    this.transferDepartmentId = null;
    this.transferReason = '';
  }

  transferChat(): void {
    if (!this.selectedChat || !this.transferDepartmentId) return;

    const transferData: TransferRequest = {
      chat_session_id: this.selectedChat.id,
      target_department_id: this.transferDepartmentId,
      reason: this.transferReason || undefined
    };

    this.apiService.transferChat(transferData).subscribe({
      next: () => {
        this.showTransferModal = false;
        this.selectedChat = null;
        this.disconnectWebSocket();
        this.loadChats();
      },
      error: (err) => {
        console.error('Failed to transfer chat', err);
        alert('Failed to transfer chat');
      }
    });
  }

  updateStatus(): void {
    if (!this.currentUser) return;

    this.apiService.updateAgentStatus(this.currentUser.id, this.currentStatus).subscribe({
      error: (err) => console.error('Failed to update status', err)
    });
  }

  logout(): void {
    this.disconnectWebSocket();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
