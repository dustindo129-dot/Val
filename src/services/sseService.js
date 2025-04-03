import config from '../config/config';

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectTimeout = null;
  }

  connect() {
    if (this.eventSource) {
      return;
    }

    try {
      this.eventSource = new EventSource(`${config.backendUrl}/api/novels/sse`);
      
      this.eventSource.onopen = () => {
        console.log('SSE connection established');
        this.isConnected = true;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.isConnected = false;
        
        // Try to reconnect after a delay
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            this.disconnect();
            this.connect();
          }, 5000);
        }
      };

      // Set up default event listeners
      const events = ['update', 'novel_status_changed', 'novel_deleted', 'refresh', 'new_novel', 'new_chapter'];
      events.forEach(eventName => {
        this.eventSource.addEventListener(eventName, (event) => {
          const listeners = this.listeners.get(eventName) || [];
          listeners.forEach(callback => {
            try {
              const data = event.data ? JSON.parse(event.data) : null;
              callback(data);
            } catch (error) {
              console.error(`Error processing ${eventName} event:`, error);
            }
          });
        });
      });
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
      this.isConnected = false;
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  addEventListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    // Connect if not already connected
    if (!this.isConnected) {
      this.connect();
    }
  }

  removeEventListener(eventName, callback) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }

    // If no more listeners, disconnect
    if (this.listeners.size === 0) {
      this.disconnect();
    }
  }
}

// Create a singleton instance
const sseService = new SSEService();

export default sseService; 