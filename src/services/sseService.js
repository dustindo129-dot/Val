import config from '../config/config';

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.isManuallyDisconnected = false;
    
    // Use sessionStorage to persist tab ID across refreshes
    this.tabId = this.getOrCreateTabId();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
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

  handleOnline() {
    if (!this.isConnected && !this.isManuallyDisconnected) {
      this.reconnectAttempts = 0; // Reset attempts when coming back online
      this.scheduleReconnect(1000); // Reconnect quickly when online
    }
  }

  handleOffline() {
    this.clearReconnectTimeout();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, reduce reconnection frequency
      return;
    } else {
      // Page is visible again, check connection
      if (!this.isConnected && !this.isManuallyDisconnected) {
        this.scheduleReconnect(2000);
      }
    }
  }

  getReconnectDelay() {
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    // Add jitter (±25% random variation) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(1000, delay + jitter);
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  scheduleReconnect(customDelay = null) {
    this.clearReconnectTimeout();
    
    // Don't reconnect if manually disconnected or offline
    if (this.isManuallyDisconnected || !navigator.onLine) {
      return;
    }
    
    const delay = customDelay || this.getReconnectDelay();
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.disconnect();
        this.connect();
      } else {
        this.clearReconnectTimeout();
      }
    }, delay);
  }

  connect() {
    // Don't connect if manually disconnected or already connecting/connected
    if (this.isManuallyDisconnected || this.eventSource) {
      return;
    }

    try {
      // Add a unique query parameter to force a new connection for each tab
      this.eventSource = new EventSource(`${config.backendUrl}/api/novels/sse?tabId=${this.tabId}`);
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.clearReconnectTimeout();
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        
        // Only attempt reconnection if the connection is actually broken
        // ReadyState 2 means CLOSED, which requires reconnection
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Don't schedule another reconnect if still trying to connect
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.clientId) {
            this.clientId = data.clientId;
          }
        } catch (error) {
          console.error('Error processing initial message:', error);
        }
      };

      // Set up default event listeners
      const events = ['update', 'novel_status_changed', 'novel_deleted', 'refresh', 'new_novel', 'new_chapter', 'new_notification', 'notification_read', 'notifications_cleared'];
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
      this.scheduleReconnect();
    }
  }

  disconnect(manual = false) {
    this.isManuallyDisconnected = manual;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.clearReconnectTimeout();
    
    if (manual) {
      this.reconnectAttempts = 0; // Reset attempts on manual disconnect
    }
  }

  // Method to manually reconnect (resets attempt counter)
  forceReconnect() {
    this.isManuallyDisconnected = false;
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  addEventListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    // Connect if not already connected and not manually disconnected
    if (!this.isConnected && !this.isManuallyDisconnected) {
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

    // If no more listeners, disconnect manually (stop reconnection attempts)
    if (this.listeners.size === 0) {
      this.disconnect(true);
    }
  }
}

// Create a singleton instance
const sseService = new SSEService();

export default sseService; 