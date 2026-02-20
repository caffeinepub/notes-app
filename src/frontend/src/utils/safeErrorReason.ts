/**
 * Extracts a safe, UI-friendly error reason from unknown error objects
 * without exposing stack traces or sensitive details.
 */
export function safeErrorReason(error: unknown): string {
  if (!error) return '';

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Normalize common error patterns
    if (message.includes('actor not available') || message.includes('actor not initialized')) {
      return 'System is initializing, please try again';
    }
    
    if (message.includes('unauthorized') || message.includes('permission')) {
      return 'You do not have permission to perform this action';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error, please check your connection';
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out, please try again';
    }
    
    // Return the original message if it's short and safe
    if (error.message.length < 100 && !error.message.includes('at ')) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    if (error.length < 100) {
      return error;
    }
    return 'An unexpected error occurred';
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg.length < 100) {
      return msg;
    }
  }

  return 'An unexpected error occurred';
}
