/**
 * Frontend error handling utilities with production-safe error sanitization.
 */

import { toast } from '@/components/ui/use-toast';

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  SERVER_ERROR = 'server_error',
  NETWORK = 'network',
  CONFIGURATION = 'configuration'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface BackendErrorResponse {
  error: boolean;
  error_id: string;
  category: string;
  message: string;
  debug_info?: {
    error_type: string;
    error_message: string;
    traceback: string;
  };
}

export interface FrontendError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: Date;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleApiError(error: any, context?: Record<string, any>): FrontendError {
    const frontendError = this.createFrontendError(error, context);
    this.logError(frontendError);
    this.showUserNotification(frontendError);
    return frontendError;
  }

  handleNetworkError(error: any, context?: Record<string, any>): FrontendError {
    const frontendError: FrontendError = {
      id: this.generateErrorId(),
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Network error occurred',
      userMessage: 'Connection problem. Please check your internet connection and try again.',
      originalError: error,
      context,
      timestamp: new Date()
    };

    this.logError(frontendError);
    this.showUserNotification(frontendError);
    return frontendError;
  }

  handleValidationError(error: any, context?: Record<string, any>): FrontendError {
    const frontendError: FrontendError = {
      id: this.generateErrorId(),
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: error.message || 'Validation error',
      userMessage: this.extractUserMessage(error) || 'Please check your input and try again.',
      originalError: error,
      context,
      timestamp: new Date()
    };

    this.logError(frontendError);
    return frontendError;
  }

  handleAuthenticationError(error: any, context?: Record<string, any>): FrontendError {
    const frontendError: FrontendError = {
      id: this.generateErrorId(),
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Authentication error',
      userMessage: 'Your session has expired. Please log in again.',
      originalError: error,
      context,
      timestamp: new Date()
    };

    this.logError(frontendError);
    this.showUserNotification(frontendError);
    
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
    
    return frontendError;
  }

  private createFrontendError(error: any, context?: Record<string, any>): FrontendError {
    if (error.response?.data && this.isBackendErrorResponse(error.response.data)) {
      return this.createFromBackendError(error.response.data, error, context);
    }

    if (error.response?.status) {
      return this.createFromHttpStatus(error.response.status, error, context);
    }

    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return this.handleNetworkError(error, context);
    }

    return this.createGenericError(error, context);
  }

  private isBackendErrorResponse(data: any): data is BackendErrorResponse {
    return data && typeof data === 'object' && data.error === true && data.category;
  }

  private createFromBackendError(
    backendError: BackendErrorResponse,
    originalError: any,
    context?: Record<string, any>
  ): FrontendError {
    return {
      id: backendError.error_id || this.generateErrorId(),
      category: this.mapBackendCategory(backendError.category),
      severity: this.determineSeverity(backendError.category),
      message: backendError.message,
      userMessage: backendError.message,
      originalError,
      context,
      timestamp: new Date()
    };
  }

  private createFromHttpStatus(
    status: number,
    originalError: any,
    context?: Record<string, any>
  ): FrontendError {
    let category: ErrorCategory;
    let userMessage: string;
    let severity: ErrorSeverity;

    switch (status) {
      case 401:
        category = ErrorCategory.AUTHENTICATION;
        userMessage = 'Your session has expired. Please log in again.';
        severity = ErrorSeverity.MEDIUM;
        break;
      case 403:
        category = ErrorCategory.AUTHORIZATION;
        userMessage = "You don't have permission to perform this action.";
        severity = ErrorSeverity.MEDIUM;
        break;
      case 404:
        category = ErrorCategory.NOT_FOUND;
        userMessage = 'The requested resource was not found.';
        severity = ErrorSeverity.LOW;
        break;
      case 429:
        category = ErrorCategory.RATE_LIMIT;
        userMessage = 'Too many requests. Please try again later.';
        severity = ErrorSeverity.MEDIUM;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        category = ErrorCategory.SERVER_ERROR;
        userMessage = 'Server error. Please try again later.';
        severity = ErrorSeverity.HIGH;
        break;
      default:
        category = ErrorCategory.SERVER_ERROR;
        userMessage = 'An unexpected error occurred. Please try again.';
        severity = ErrorSeverity.MEDIUM;
    }

    return {
      id: this.generateErrorId(),
      category,
      severity,
      message: originalError.message || `HTTP ${status} error`,
      userMessage,
      originalError,
      context,
      timestamp: new Date()
    };
  }

  private createGenericError(error: any, context?: Record<string, any>): FrontendError {
    return {
      id: this.generateErrorId(),
      category: ErrorCategory.SERVER_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again.',
      originalError: error,
      context,
      timestamp: new Date()
    };
  }

  private mapBackendCategory(backendCategory: string): ErrorCategory {
    const categoryMap: Record<string, ErrorCategory> = {
      'authentication': ErrorCategory.AUTHENTICATION,
      'authorization': ErrorCategory.AUTHORIZATION,
      'validation': ErrorCategory.VALIDATION,
      'not_found': ErrorCategory.NOT_FOUND,
      'rate_limit': ErrorCategory.RATE_LIMIT,
      'database': ErrorCategory.DATABASE,
      'external_service': ErrorCategory.EXTERNAL_SERVICE,
      'server_error': ErrorCategory.SERVER_ERROR,
      'configuration': ErrorCategory.CONFIGURATION
    };

    return categoryMap[backendCategory] || ErrorCategory.SERVER_ERROR;
  }

  private determineSeverity(category: string): ErrorSeverity {
    const severityMap: Record<string, ErrorSeverity> = {
      'authentication': ErrorSeverity.MEDIUM,
      'authorization': ErrorSeverity.MEDIUM,
      'validation': ErrorSeverity.LOW,
      'not_found': ErrorSeverity.LOW,
      'rate_limit': ErrorSeverity.MEDIUM,
      'database': ErrorSeverity.HIGH,
      'external_service': ErrorSeverity.MEDIUM,
      'server_error': ErrorSeverity.HIGH,
      'configuration': ErrorSeverity.CRITICAL
    };

    return severityMap[category] || ErrorSeverity.MEDIUM;
  }

  private extractUserMessage(error: any): string | null {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.message && !this.containsSensitiveInfo(error.message)) {
      return error.message;
    }
    
    return null;
  }

  private containsSensitiveInfo(message: string): boolean {
    const sensitivePatterns = [
      /stack trace/i,
      /traceback/i,
      /database/i,
      /sql/i,
      /connection/i,
      /internal server error/i,
      /exception/i,
      /error at line/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(message));
  }

  private logError(error: FrontendError): void {
    const logData = {
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp.toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (this.isDevelopment) {
      console.group(`Error ${error.id}`);
      console.error('Error Details:', logData);
      if (error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      console.groupEnd();
    } else {
      console.error('Error occurred:', error.id);
    }
  }

  private showUserNotification(error: FrontendError): void {
    if (error.category === ErrorCategory.VALIDATION) {
      return;
    }

    const variant = error.severity === ErrorSeverity.LOW ? 'default' : 'destructive';
    
    toast({
      variant,
      title: this.getErrorTitle(error.category),
      description: error.userMessage,
      duration: this.getToastDuration(error.severity)
    });
  }

  private getErrorTitle(category: ErrorCategory): string {
    const titleMap: Record<ErrorCategory, string> = {
      [ErrorCategory.AUTHENTICATION]: 'Authentication Error',
      [ErrorCategory.AUTHORIZATION]: 'Permission Denied',
      [ErrorCategory.VALIDATION]: 'Validation Error',
      [ErrorCategory.NOT_FOUND]: 'Not Found',
      [ErrorCategory.RATE_LIMIT]: 'Rate Limit Exceeded',
      [ErrorCategory.DATABASE]: 'Database Error',
      [ErrorCategory.EXTERNAL_SERVICE]: 'Service Unavailable',
      [ErrorCategory.SERVER_ERROR]: 'Server Error',
      [ErrorCategory.NETWORK]: 'Network Error',
      [ErrorCategory.CONFIGURATION]: 'Configuration Error'
    };

    return titleMap[category] || 'Error';
  }

  private getToastDuration(severity: ErrorSeverity): number {
    const durationMap: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 3000,
      [ErrorSeverity.MEDIUM]: 5000,
      [ErrorSeverity.HIGH]: 7000,
      [ErrorSeverity.CRITICAL]: 10000
    };

    return durationMap[severity] || 5000;
  }

  private generateErrorId(): string {
    return `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorHandler = ErrorHandler.getInstance();

export const handleApiError = (error: any, context?: Record<string, any>) => 
  errorHandler.handleApiError(error, context);

export const handleNetworkError = (error: any, context?: Record<string, any>) => 
  errorHandler.handleNetworkError(error, context);

export const handleValidationError = (error: any, context?: Record<string, any>) => 
  errorHandler.handleValidationError(error, context);

export const handleAuthenticationError = (error: any, context?: Record<string, any>) => 
  errorHandler.handleAuthenticationError(error, context);