import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="app-container">
      <nav class="navbar">
        <a routerLink="/chat" routerLinkActive="active">Customer Chat</a>
        <a routerLink="/admin" routerLinkActive="active">Admin Dashboard</a>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
    }

    .navbar {
      display: flex;
      background: #343a40;
      padding: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .navbar a {
      padding: 15px 30px;
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.3s;
    }

    .navbar a:hover {
      background: #495057;
    }

    .navbar a.active {
      background: #667eea;
    }
  `]
})
export class AppComponent {
  title = 'Customer Care Bot';
}
