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
    
    // Circuit breaker for rapid reconnections
    this.recentConnections = [];
    this.circuitBreakerThreshold = 3; // Max 3 connections in a time window
    this.circuitBreakerWindow = 10000; // 10 seconds window
    this.circuitBreakerCooldown = 30000; // 30 seconds cooldown
    this.isCircuitBreakerOpen = false;
    
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
      // Page is hidden, stop any pending reconnections to save resources
      console.log(`Tab ${this.tabId} hidden, clearing reconnect timeout`);
      this.clearReconnectTimeout();
    } else {
      // Page is visible again, check connection and reconnect if needed
      console.log(`Tab ${this.tabId} visible again, checking connection`);
      if (!this.isConnected && !this.isManuallyDisconnected && this.listeners.size > 0) {
        // Reset attempts when tab becomes visible again
        this.reconnectAttempts = Math.max(0, this.reconnectAttempts - 2);
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
    
    // Add extra delay if there have been multiple recent reconnection attempts
    // This helps prevent bulk reconnection storms
    const extraDelay = this.reconnectAttempts > 3 ? (this.reconnectAttempts - 3) * 2000 : 0;
    
    return Math.max(1000, delay + jitter + extraDelay);
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Check if circuit breaker should be triggered
  checkCircuitBreaker() {
    const now = Date.now();
    
    // Clean old entries outside the window
    this.recentConnections = this.recentConnections.filter(
      timestamp => now - timestamp < this.circuitBreakerWindow
    );
    
    // Check if we've exceeded the threshold
    if (this.recentConnections.length >= this.circuitBreakerThreshold) {
      if (!this.isCircuitBreakerOpen) {
        console.log(`🔥 Circuit breaker OPEN for tab ${this.tabId}: ${this.recentConnections.length} connections in ${this.circuitBreakerWindow}ms`);
        console.log(`🔥 Recent connection timestamps:`, this.recentConnections);
        this.isCircuitBreakerOpen = true;
        
        // Set a timeout to close the circuit breaker
        setTimeout(() => {
          console.log(`❄️ Circuit breaker CLOSED for tab ${this.tabId} after ${this.circuitBreakerCooldown}ms cooldown`);
          this.isCircuitBreakerOpen = false;
          this.recentConnections = [];
          this.reconnectAttempts = 0; // Reset attempts when circuit breaker closes
        }, this.circuitBreakerCooldown);
      }
      return true;
    }
    
    return false;
  }

  // Record a connection attempt
  recordConnectionAttempt() {
    this.recentConnections.push(Date.now());
  }

  scheduleReconnect(customDelay = null) {
    this.clearReconnectTimeout();
    
    // Don't reconnect if manually disconnected or offline
    if (this.isManuallyDisconnected || !navigator.onLine) {
      console.log(`Skipping reconnect for tab ${this.tabId}: manually disconnected or offline`);
      return;
    }
    
    // Don't reconnect if page is hidden (background tab)
    if (document.hidden) {
      console.log(`Skipping reconnect for tab ${this.tabId}: tab is hidden`);
      return;
    }

    // Don't reconnect if circuit breaker is open
    if (this.isCircuitBreakerOpen) {
      console.log(`Skipping reconnect for tab ${this.tabId}: circuit breaker is open`);
      return;
    }
    
    const delay = customDelay || this.getReconnectDelay();
    console.log(`Scheduling reconnect for tab ${this.tabId} in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.disconnect();
        this.connect();
      } else {
        console.log(`Max reconnect attempts reached for tab ${this.tabId}`);
        this.clearReconnectTimeout();
      }
    }, delay);
  }

  connect() {
    // Don't connect if manually disconnected or already connecting/connected
    if (this.isManuallyDisconnected || this.eventSource) {
      console.log(`Skipping connect for tab ${this.tabId}: manually disconnected (${this.isManuallyDisconnected}) or already has eventSource (${!!this.eventSource})`);
      return;
    }

    // Extra safety check - if we have an eventSource that's still connecting, wait
    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
      console.log(`Tab ${this.tabId} already connecting, waiting...`);
      return;
    }

    // Check circuit breaker
    if (this.checkCircuitBreaker()) {
      console.log(`🛑 Circuit breaker is OPEN for tab ${this.tabId}, blocking connection attempt`);
      return;
    }

    // Record this connection attempt
    this.recordConnectionAttempt();
    console.log(`📡 Recording connection attempt for tab ${this.tabId} (${this.recentConnections.length} recent connections)`);

    try {
      // Add a unique query parameter to force a new connection for each tab
      this.eventSource = new EventSource(`${config.backendUrl}/api/novels/sse?tabId=${this.tabId}`);
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.clearReconnectTimeout();
        console.log(`SSE connected for tab ${this.tabId}`);
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        
        // Only attempt reconnection if the connection is actually broken
        // ReadyState 2 means CLOSED, which requires reconnection
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log(`SSE connection closed for tab ${this.tabId}, scheduling reconnect`);
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Don't schedule another reconnect if still trying to connect
          console.log(`SSE still connecting for tab ${this.tabId}, waiting...`);
        } else {
          // Handle other error states more gracefully
          console.log(`SSE error for tab ${this.tabId}, state: ${this.eventSource?.readyState}`);
          // Only reconnect if we're not in a connecting state
          if (this.eventSource?.readyState !== EventSource.CONNECTING) {
            this.scheduleReconnect();
          }
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.clientId) {
            this.clientId = data.clientId;
            console.log(`SSE client ID assigned: ${data.clientId} for tab ${this.tabId}`);
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

      // Handle duplicate connection detection
      this.eventSource.addEventListener('duplicate_connection', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`🔴 DUPLICATE CONNECTION DETECTED for tab ${this.tabId}:`, data);
          console.log(`🔴 Current eventSource state:`, this.eventSource?.readyState);
          console.log(`🔴 Current connection state - isConnected: ${this.isConnected}, isManuallyDisconnected: ${this.isManuallyDisconnected}`);
          
          // This connection is being closed by the server as it's a duplicate
          // Don't try to reconnect immediately to avoid creating another duplicate
          this.isManuallyDisconnected = true;
          this.clearReconnectTimeout();
          
          // Reset reconnection attempts to prevent immediate reconnection
          this.reconnectAttempts = 0;
          
          // Open circuit breaker to prevent rapid reconnections
          this.isCircuitBreakerOpen = true;
          console.log(`🔴 Circuit breaker OPENED for tab ${this.tabId} due to duplicate connection`);
          
          // Wait longer before allowing reconnections again
          const delayTime = 20000; // Increased to 20 seconds
          console.log(`🔴 Setting ${delayTime}ms delay before re-enabling connections for tab ${this.tabId}`);
          
          setTimeout(() => {
            console.log(`🟢 Re-enabling connections for tab ${this.tabId} after duplicate cleanup (${delayTime}ms delay)`);
            this.isManuallyDisconnected = false;
            this.isCircuitBreakerOpen = false;
            this.recentConnections = []; // Clear recent connections
            
            // Only reconnect if we still have listeners and tab is visible
            if (this.listeners.size > 0 && !document.hidden) {
              console.log(`🟢 Tab ${this.tabId} will attempt reconnection in 3 seconds...`);
              // Use a longer delay for the actual reconnection
              setTimeout(() => {
                if (!this.eventSource && !this.isManuallyDisconnected) {
                  console.log(`🟢 Tab ${this.tabId} attempting reconnection now`);
                  this.connect();
                } else {
                  console.log(`🟢 Tab ${this.tabId} skipping reconnection - eventSource exists: ${!!this.eventSource}, manually disconnected: ${this.isManuallyDisconnected}`);
                }
              }, 3000); // Additional 3 second delay
            } else {
              console.log(`🟢 Tab ${this.tabId} skipping reconnection - no listeners (${this.listeners.size}) or tab hidden (${document.hidden})`);
            }
          }, delayTime);
        } catch (error) {
          console.error('🔴 Error processing duplicate_connection event:', error);
        }
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
      // Clean up event source properly
      this.eventSource.close();
      this.eventSource = null;
      console.log(`SSE disconnected for tab ${this.tabId} (manual: ${manual})`);
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