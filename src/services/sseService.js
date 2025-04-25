import config from '../config/config';

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.clientId = null;
    
    // Use sessionStorage to persist tab ID across refreshes
    this.tabId = this.getOrCreateTabId();
  }

  // Get existing tab ID from sessionStorage or create a new one
  getOrCreateTabId() {
    const storageKey = 'sse_tab_id';
    let tabId = sessionStorage.getItem(storageKey);
    
    // If no existing tab ID, create and store a new one
    if (!tabId) {
      // Generate a unique ID using timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const uniqueId = `${timestamp}_${randomStr}`;
      tabId = `tab_${uniqueId}`;
      
      // Store in sessionStorage (unique per tab)
      sessionStorage.setItem(storageKey, tabId);
    }
    
    return tabId;
  }

  connect() {
    if (this.eventSource) {
      return;
    }

    try {
      // Add a unique query parameter to force a new connection for each tab
      this.eventSource = new EventSource(`${config.backendUrl}/api/novels/sse?tabId=${this.tabId}`);
      
      this.eventSource.onopen = () => {
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
            this.disconnect();
            this.connect();
          }, 5000);
        }
      };

      // Listen for the initial connection message to get client ID
      this.eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.clientId) {
            this.clientId = data.clientId;
          }
        } catch (error) {
          console.error('Error processing initial message:', error);
        }
      });

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
      console.error(`Error setting up SSE connection for tab ${this.tabId}:`, error);
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