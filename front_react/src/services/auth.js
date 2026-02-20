import apiService from './api';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  async login(email, password) {
    try {
      const response = await apiService.login(email, password);
      this.currentUser = response.user;
      this.isAuthenticated = true;
      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      if (!apiService.token) {
        return null;
      }
      
      const user = await apiService.getCurrentUser();
      this.currentUser = user;
      this.isAuthenticated = true;
      return user;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  logout() {
    apiService.logout();
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  async refreshToken() {
    try {
      await apiService.refreshToken();
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // Check if user is authenticated
  isLoggedIn() {
    return this.isAuthenticated && !!apiService.token;
  }

  // Get current user
  getUser() {
    return this.currentUser;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
