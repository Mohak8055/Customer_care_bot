export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  CUSTOMER = 'customer'
}

export enum ChatStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  CLOSED = 'closed'
}

export enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_customer_care: boolean;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  department_id?: number;
  is_active: boolean;
  agent_status: AgentStatus;
  created_at: string;
  updated_at?: string;
  department?: Department;
}

export interface ChatSession {
  id: number;
  customer_name: string;
  customer_email: string;
  department_id: number;
  assigned_agent_id?: number;
  status: ChatStatus;
  transferred_from?: number;
  created_at: string;
  updated_at?: string;
  closed_at?: string;
  department?: Department;
  assigned_agent?: User;
}

export interface Message {
  id: number;
  chat_session_id: number;
  sender_id?: number;
  sender_name: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
}

export interface ChatSessionCreate {
  customer_name: string;
  customer_email: string;
  department_id?: number;
}

export interface MessageCreate {
  chat_session_id: number;
  sender_id?: number;
  sender_name: string;
  content: string;
  is_system_message?: boolean;
}

export interface DepartmentCreate {
  name: string;
  description?: string;
  is_active?: boolean;
  is_customer_care?: boolean;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role: UserRole;
  department_id?: number;
}

export interface TransferRequest {
  chat_session_id: number;
  target_department_id: number;
  reason?: string;
}

export interface WSMessage {
  type: string;
  chat_session_id?: number;
  sender_name?: string;
  content?: string;
  department_id?: number;
  timestamp?: string;
  message_id?: number;
  is_system_message?: boolean;
}

// Review/Rating interfaces
export interface Review {
  id: number;
  chat_session_id: number;
  rating: number; // 1-5 stars
  comment?: string;
  customer_name: string;
  customer_email: string;
  agent_id?: number;
  agent_name?: string;
  department_id: number;
  department_name?: string;
  created_at: string;
}

export interface ReviewCreate {
  chat_session_id: number;
  rating: number;
  comment?: string;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
}

// Authentication interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  department_id?: number;
}

// Queue Status interface
export interface QueueStatus {
  chat_session_id: number;
  position: number;
  estimated_wait_minutes: number;
  status: ChatStatus;
  agents_available: number;
  agents_busy: number;
}

// Incoming assignment notification
export interface IncomingAssignment {
  type: string;
  chat_session_id: number;
  customer_name: string;
  customer_email: string;
  timeout_seconds: number;
  message: string;
}
