import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Department,
  DepartmentCreate,
  User,
  UserCreate,
  ChatSession,
  ChatSessionCreate,
  Message,
  MessageCreate,
  TransferRequest,
  ChatStatus,
  UserRole,
  AgentStatus,
  Review,
  ReviewCreate,
  ReviewStats,
  QueueStatus
} from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Department endpoints
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/api/departments/`);
  }

  getActiveDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/api/departments/active`);
  }

  getCustomerCareDepartment(): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/api/departments/customer-care`);
  }

  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/api/departments/${id}`);
  }

  createDepartment(department: DepartmentCreate): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}/api/departments/`, department);
  }

  updateDepartment(id: number, department: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/api/departments/${id}`, department);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/departments/${id}`);
  }

  // User endpoints
  getUsers(params?: { role?: UserRole; department_id?: number }): Observable<User[]> {
    let httpParams = new HttpParams();
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params?.department_id) {
      httpParams = httpParams.set('department_id', params.department_id.toString());
    }
    return this.http.get<User[]>(`${this.baseUrl}/api/users/`, { params: httpParams });
  }

  getAvailableAgents(departmentId?: number): Observable<User[]> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('department_id', departmentId.toString());
    }
    return this.http.get<User[]>(`${this.baseUrl}/api/users/agents/available`, { params });
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/api/users/${id}`);
  }

  createUser(user: UserCreate): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/api/users/`, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/api/users/${id}`, user);
  }

  updateAgentStatus(id: number, status: AgentStatus): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/api/users/${id}/status`, null, {
      params: { agent_status: status }
    });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/users/${id}`);
  }

  // Chat session endpoints
  getChatSessions(params?: {
    status_filter?: ChatStatus;
    department_id?: number;
    agent_id?: number;
  }): Observable<ChatSession[]> {
    let httpParams = new HttpParams();
    if (params?.status_filter) {
      httpParams = httpParams.set('status_filter', params.status_filter);
    }
    if (params?.department_id) {
      httpParams = httpParams.set('department_id', params.department_id.toString());
    }
    if (params?.agent_id) {
      httpParams = httpParams.set('agent_id', params.agent_id.toString());
    }
    return this.http.get<ChatSession[]>(`${this.baseUrl}/api/chats/`, { params: httpParams });
  }

  getChatSession(id: number): Observable<ChatSession> {
    return this.http.get<ChatSession>(`${this.baseUrl}/api/chats/${id}`);
  }

  createChatSession(chatData: ChatSessionCreate): Observable<ChatSession> {
    return this.http.post<ChatSession>(`${this.baseUrl}/api/chats/`, chatData);
  }

  getChatMessages(chatSessionId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/api/chats/${chatSessionId}/messages`);
  }

  sendMessage(message: MessageCreate): Observable<Message> {
    return this.http.post<Message>(
      `${this.baseUrl}/api/chats/${message.chat_session_id}/messages`,
      message
    );
  }

  transferChat(transferData: TransferRequest): Observable<ChatSession> {
    return this.http.post<ChatSession>(
      `${this.baseUrl}/api/chats/${transferData.chat_session_id}/transfer`,
      transferData
    );
  }

  closeChat(chatSessionId: number): Observable<ChatSession> {
    return this.http.put<ChatSession>(`${this.baseUrl}/api/chats/${chatSessionId}/close`, {});
  }

  claimChat(chatSessionId: number, agentId: number): Observable<ChatSession> {
    return this.http.put<ChatSession>(
      `${this.baseUrl}/api/chats/${chatSessionId}/claim?agent_id=${agentId}`,
      {}
    );
  }

  getQueueStatus(chatSessionId: number): Observable<QueueStatus> {
    return this.http.get<QueueStatus>(`${this.baseUrl}/api/chats/${chatSessionId}/queue-status`);
  }

  acceptAssignment(chatSessionId: number, agentId: number): Observable<ChatSession> {
    return this.http.put<ChatSession>(
      `${this.baseUrl}/api/chats/${chatSessionId}/accept-assignment?agent_id=${agentId}`,
      {}
    );
  }

  declineAssignment(chatSessionId: number, agentId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/chats/${chatSessionId}/decline-assignment?agent_id=${agentId}`,
      {}
    );
  }

  // Review endpoints
  submitReview(review: ReviewCreate): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/api/reviews/`, review);
  }

  getReviews(params?: {
    department_id?: number;
    agent_id?: number;
    min_rating?: number;
    max_rating?: number;
    limit?: number;
    offset?: number;
  }): Observable<Review[]> {
    let httpParams = new HttpParams();
    if (params?.department_id) {
      httpParams = httpParams.set('department_id', params.department_id.toString());
    }
    if (params?.agent_id) {
      httpParams = httpParams.set('agent_id', params.agent_id.toString());
    }
    if (params?.min_rating) {
      httpParams = httpParams.set('min_rating', params.min_rating.toString());
    }
    if (params?.max_rating) {
      httpParams = httpParams.set('max_rating', params.max_rating.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    return this.http.get<Review[]>(`${this.baseUrl}/api/reviews/`, { params: httpParams });
  }

  getReview(id: number): Observable<Review> {
    return this.http.get<Review>(`${this.baseUrl}/api/reviews/${id}`);
  }

  getReviewStats(params?: { department_id?: number; agent_id?: number }): Observable<ReviewStats> {
    let httpParams = new HttpParams();
    if (params?.department_id) {
      httpParams = httpParams.set('department_id', params.department_id.toString());
    }
    if (params?.agent_id) {
      httpParams = httpParams.set('agent_id', params.agent_id.toString());
    }
    return this.http.get<ReviewStats>(`${this.baseUrl}/api/reviews/stats`, { params: httpParams });
  }
}
