import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { WSMessage } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket?: WebSocket;
  private messagesSubject?: Subject<WSMessage>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private currentChatId?: number;
  private currentSenderName?: string;
  private currentSenderId?: number;

  constructor() {}

  connectToChat(
    chatSessionId: number,
    senderName: string,
    senderId?: number
  ): Observable<WSMessage> {
    // Always disconnect existing connection first
    this.disconnect();

    // Create a fresh Subject for each connection
    this.messagesSubject = new Subject<WSMessage>();

    // Store connection params for reconnection
    this.currentChatId = chatSessionId;
    this.currentSenderName = senderName;
    this.currentSenderId = senderId;

    this.createChatConnection(chatSessionId, senderName, senderId);

    return this.messagesSubject.asObservable();
  }

  private createChatConnection(chatSessionId: number, senderName: string, senderId?: number): void {
    const wsUrl = `${environment.wsUrl}/ws/chat/${chatSessionId}?sender_name=${encodeURIComponent(senderName)}${senderId ? '&sender_id=' + senderId : ''}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected to chat:', chatSessionId);
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messagesSubject?.next(message);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        // Attempt reconnection if not intentionally closed
        if (this.currentChatId && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => {
            if (this.currentChatId && this.currentSenderName) {
              this.createChatConnection(this.currentChatId, this.currentSenderName, this.currentSenderId);
            }
          }, this.reconnectDelay);
        }
      };
    } catch (e) {
      console.error('Error creating WebSocket connection:', e);
    }
  }

  connectAgent(agentId: number, departmentId?: number): Observable<WSMessage> {
    // Always disconnect existing connection first
    this.disconnect();

    // Create a fresh Subject
    this.messagesSubject = new Subject<WSMessage>();

    const wsUrl = `${environment.wsUrl}/ws/agent/${agentId}${departmentId ? '?department_id=' + departmentId : ''}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('Agent WebSocket connected:', agentId);
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messagesSubject?.next(message);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Agent WebSocket error:', error);
      };

      this.socket.onclose = () => {
        console.log('Agent WebSocket closed');
      };
    } catch (e) {
      console.error('Error creating Agent WebSocket:', e);
    }

    return this.messagesSubject.asObservable();
  }

  sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, message not sent:', message);
    }
  }

  sendTypingIndicator(chatSessionId: number, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing',
      chat_session_id: chatSessionId,
      is_typing: isTyping,
      timestamp: new Date().toISOString()
    });
  }

  updateAgentStatus(status: string): void {
    this.sendMessage({
      type: 'status_update',
      status: status
    });
  }

  disconnect(): void {
    this.currentChatId = undefined;
    this.currentSenderName = undefined;
    this.currentSenderId = undefined;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }

    // Don't complete the subject, just clear it
    this.messagesSubject = undefined;
  }

  isConnected(): boolean {
    return this.socket !== undefined && this.socket.readyState === WebSocket.OPEN;
  }
}
