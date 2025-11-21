import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check for required role
    const requiredRole = route.data['role'] as UserRole;
    if (requiredRole && !this.authService.hasRole(requiredRole)) {
      // If user is logged in but doesn't have permission, redirect to appropriate page
      if (this.authService.isAgent()) {
        this.router.navigate(['/agent']);
      } else {
        this.router.navigate(['/']);
      }
      return false;
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (!this.authService.isAdmin()) {
      this.router.navigate(['/agent']);
      return false;
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AgentGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (!this.authService.canAccessAgentFeatures()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
