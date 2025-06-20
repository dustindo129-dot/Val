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
    this.baseReconnectDelay = 1000; // Back to original 1 second
    this.maxReconnectDelay = 30000; // Back to original 30 seconds
    this.isManuallyDisconnected = false;
    
    // Circuit breaker for rapid reconnections
    this.recentConnections = [];
    this.circuitBreakerThreshold = 3; // Back to original
    this.circuitBreakerWindow = 10000; // Back to original
    this.circuitBreakerCooldown = 30000; // Back to original
    this.isCircuitBreakerOpen = false;
    
    // Connection sharing between tabs using BroadcastChannel
    this.broadcastChannel = new BroadcastChannel('sse_connection_sharing');
    this.isLeaderTab = false;
    this.leaderElectionTimeout = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = 0;
    
    // Generate unique session ID (same across tabs for same user session)
    this.sessionId = this.getOrCreateSessionId();
    this.tabId = this.getOrCreateTabId();
    
    // Start leader election process
    this.startLeaderElection();
    
    // Listen for messages from other tabs
    this.broadcastChannel.addEventListener('message', (event) => {
      this.handleBroadcastMessage(event.data);
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    // Listen for beforeunload to handle leader handoff
    window.addEventListener('beforeunload', () => this.handleBeforeUnload());
  }

  // Get or create session ID (shared across tabs for same user)
  getOrCreateSessionId() {
    const storageKey = 'sse_session_id';
    let sessionId = localStorage.getItem(storageKey);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(storageKey, sessionId);
    }
    
    return sessionId;
  }

  // Get existing tab ID from sessionStorage or create a new one
  getOrCreateTabId() {
    const storageKey = 'sse_tab_id';
    let tabId = sessionStorage.getItem(storageKey);
    
    if (!tabId) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const uniqueId = `${timestamp}_${randomStr}`;
      tabId = `tab_${uniqueId}`;
      sessionStorage.setItem(storageKey, tabId);
    }
    
    return tabId;
  }

  // Leader election: only one tab per session should maintain SSE connection
  startLeaderElection() {
    // Announce this tab wants to be leader
    this.broadcastChannel.postMessage({
      type: 'LEADER_ELECTION',
      tabId: this.tabId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });

    // Wait for responses, then decide if we should be leader
    setTimeout(() => {
      this.checkLeadershipStatus();
    }, 1000);
  }

  checkLeadershipStatus() {
    // If no other tab has claimed leadership, become leader
    if (!this.isLeaderTab) {
      this.becomeLeader();
    }
  }

  becomeLeader() {
    this.isLeaderTab = true;
    
    // Announce leadership
    this.broadcastChannel.postMessage({
      type: 'LEADER_ANNOUNCEMENT',
      tabId: this.tabId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    });

    // Start heartbeat to let other tabs know we're alive
    this.startHeartbeat();
    
    // Connect to SSE if we have listeners
    if (this.listeners.size > 0) {
      this.connect();
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcastChannel.postMessage({
        type: 'LEADER_HEARTBEAT',
        tabId: this.tabId,
        sessionId: this.sessionId,
        timestamp: Date.now()
      });
    }, 5000); // Heartbeat every 5 seconds
  }

  handleBroadcastMessage(data) {
    if (data.sessionId !== this.sessionId) return; // Ignore messages from other sessions

    switch (data.type) {
      case 'LEADER_ELECTION':
        if (data.tabId !== this.tabId && this.isLeaderTab) {
          // Another tab wants to be leader, respond with our status
          this.broadcastChannel.postMessage({
            type: 'LEADER_RESPONSE',
            tabId: this.tabId,
            sessionId: this.sessionId,
            isLeader: true,
            timestamp: Date.now()
          });
        }
        break;

      case 'LEADER_RESPONSE':
        if (data.isLeader && data.tabId !== this.tabId) {
          // Another tab is already leader
          this.isLeaderTab = false;
        }
        break;

      case 'LEADER_ANNOUNCEMENT':
        if (data.tabId !== this.tabId) {
          // Another tab became leader
          this.isLeaderTab = false;
          this.lastHeartbeat = data.timestamp;
        }
        break;

      case 'LEADER_HEARTBEAT':
        if (data.tabId !== this.tabId) {
          this.lastHeartbeat = data.timestamp;
        }
        break;

      case 'SSE_EVENT':
        // Received SSE event from leader tab, broadcast to local listeners
        if (!this.isLeaderTab) {
          this.broadcastEventToListeners(data.eventName, data.eventData);
        }
        break;

      case 'REQUEST_LEADERSHIP':
        // Another tab is requesting leadership (maybe leader died)
        if (this.isLeaderTab) {
          this.broadcastChannel.postMessage({
            type: 'LEADER_RESPONSE',
            tabId: this.tabId,
            sessionId: this.sessionId,
            isLeader: true,
            timestamp: Date.now()
          });
        }
        break;
    }
  }

  // Check if current leader is still alive
  checkLeaderHealth() {
    if (!this.isLeaderTab && this.lastHeartbeat > 0) {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > 15000) { // No heartbeat for 15 seconds
        this.broadcastChannel.postMessage({
          type: 'REQUEST_LEADERSHIP',
          tabId: this.tabId,
          sessionId: this.sessionId,
          timestamp: Date.now()
        });
        
        // Wait for response, if none, become leader
        setTimeout(() => {
          if (!this.isLeaderTab && (Date.now() - this.lastHeartbeat) > 20000) {
            this.becomeLeader();
          }
        }, 2000);
      }
    }
  }

  handleBeforeUnload() {
    if (this.isLeaderTab) {
      // Leader tab is closing, trigger new election
      this.broadcastChannel.postMessage({
        type: 'LEADER_ELECTION',
        tabId: 'closing',
        sessionId: this.sessionId,
        timestamp: Date.now()
      });
    }
  }

  broadcastEventToListeners(eventName, eventData) {
    const listeners = this.listeners.get(eventName) || [];
    listeners.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(`Error processing ${eventName} event:`, error);
      }
    });
  }

  handleOnline() {
    if (!this.isConnected && !this.isManuallyDisconnected && this.isLeaderTab) {
      this.reconnectAttempts = 0;
      this.scheduleReconnect(1000);
    }
  }

  handleOffline() {
    this.clearReconnectTimeout();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.clearReconnectTimeout();
    } else {
      // Check if leader is still alive when tab becomes visible
      if (!this.isLeaderTab) {
        this.checkLeaderHealth();
      } else if (!this.isConnected && !this.isManuallyDisconnected && this.listeners.size > 0) {
        this.reconnectAttempts = Math.max(0, this.reconnectAttempts - 2);
        this.scheduleReconnect(2000);
      }
    }
  }

  getReconnectDelay() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    const extraDelay = this.reconnectAttempts > 3 ? (this.reconnectAttempts - 3) * 2000 : 0;
    
    return Math.max(1000, delay + jitter + extraDelay);
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  checkCircuitBreaker() {
    const now = Date.now();
    
    this.recentConnections = this.recentConnections.filter(
      timestamp => now - timestamp < this.circuitBreakerWindow
    );
    
    if (this.recentConnections.length >= this.circuitBreakerThreshold) {
      if (!this.isCircuitBreakerOpen) {
        this.isCircuitBreakerOpen = true;
        
        setTimeout(() => {
          this.isCircuitBreakerOpen = false;
          this.recentConnections = [];
          this.reconnectAttempts = 0;
        }, this.circuitBreakerCooldown);
      }
      return true;
    }
    
    return false;
  }

  recordConnectionAttempt() {
    this.recentConnections.push(Date.now());
  }

  scheduleReconnect(customDelay = null) {
    // Only leader tab should reconnect
    if (!this.isLeaderTab) return;
    
    this.clearReconnectTimeout();
    
    if (this.isManuallyDisconnected || !navigator.onLine) {
      return;
    }
    
    if (document.hidden) {
      return;
    }

    if (this.isCircuitBreakerOpen) {
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
    // Only leader tab should maintain SSE connection
    if (!this.isLeaderTab) return;
    
    if (this.isManuallyDisconnected || this.eventSource) {
      return;
    }

    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
      return;
    }

    if (this.checkCircuitBreaker()) {
      return;
    }

    this.recordConnectionAttempt();

    try {
      // Use session ID instead of tab ID for connection
      this.eventSource = new EventSource(`${config.backendUrl}/api/novels/sse?sessionId=${this.sessionId}&tabId=${this.tabId}`);
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.clearReconnectTimeout();
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Don't schedule another reconnect if still trying to connect
        } else {
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
          }
        } catch (error) {
          console.error('Error processing initial message:', error);
        }
      };

      // Set up default event listeners
      const events = ['update', 'novel_status_changed', 'novel_deleted', 'refresh', 'new_novel', 'new_chapter', 'new_notification', 'notification_read', 'notifications_cleared'];
      events.forEach(eventName => {
        this.eventSource.addEventListener(eventName, (event) => {
          try {
            const eventData = event.data ? JSON.parse(event.data) : null;
            
            // Broadcast to local listeners
            this.broadcastEventToListeners(eventName, eventData);
            
            // Broadcast to other tabs
            this.broadcastChannel.postMessage({
              type: 'SSE_EVENT',
              eventName: eventName,
              eventData: eventData,
              tabId: this.tabId,
              sessionId: this.sessionId,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error(`Error processing ${eventName} event:`, error);
          }
        });
      });

      // Handle duplicate connection detection
      this.eventSource.addEventListener('duplicate_connection', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.warn('Duplicate connection detected by server');
          
          this.isManuallyDisconnected = true;
          this.clearReconnectTimeout();
          this.reconnectAttempts = 0;
          this.isCircuitBreakerOpen = true;
          
          const delayTime = 20000;
          
          setTimeout(() => {
            this.isManuallyDisconnected = false;
            this.isCircuitBreakerOpen = false;
            this.recentConnections = [];
            
            if (this.listeners.size > 0 && !document.hidden && this.isLeaderTab) {
              setTimeout(() => {
                if (!this.eventSource && !this.isManuallyDisconnected) {
                  this.connect();
                }
              }, 3000);
            }
          }, delayTime);
        } catch (error) {
          console.error('Error processing duplicate_connection event:', error);
        }
      });
    } catch (error) {
      console.error(`Error setting up SSE connection:`, error);
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
      this.reconnectAttempts = 0;
    }
  }

  forceReconnect() {
    // Only leader can force reconnect
    if (!this.isLeaderTab) return;
    
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

    // If this is the first listener and we're leader, connect
    if (!this.isConnected && !this.isManuallyDisconnected && this.isLeaderTab) {
      this.connect();
    }
    
    // If we're not leader but have listeners, check if leader exists
    if (!this.isLeaderTab && this.listeners.size === 1) {
      this.checkLeaderHealth();
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

    // If no more listeners and we're leader, disconnect
    if (this.listeners.size === 0 && this.isLeaderTab) {
      this.disconnect(true);
    }
  }

  // Cleanup method
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clearReconnectTimeout();
    this.disconnect(true);
    this.broadcastChannel.close();
  }
}

// Create a singleton instance
const sseService = new SSEService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sseService.destroy();
});

export default sseService; 