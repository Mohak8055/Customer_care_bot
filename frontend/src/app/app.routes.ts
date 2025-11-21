import { Routes } from '@angular/router';
import { ChatInterfaceComponent } from './components/chat/chat-interface.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { AgentDashboardComponent } from './components/agent/agent-dashboard.component';
import { LoginComponent } from './components/auth/login.component';
import { AdminGuard, AgentGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'chat', component: ChatInterfaceComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'agent',
    component: AgentDashboardComponent,
    canActivate: [AgentGuard]
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AdminGuard]
  }
];
