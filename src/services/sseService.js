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
    
    // Listen for authentication events
    window.addEventListener('authLogin', () => this.onLogin());
    window.addEventListener('authLogout', () => this.onLogout());
    
    // Log initialization
    console.info(`🚀 [SSE] Service initialized:`, {
      tabId: this.tabId,
      sessionId: this.sessionId,
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      circuitBreakerWindow: this.circuitBreakerWindow,
      circuitBreakerCooldown: this.circuitBreakerCooldown,
      maxReconnectAttempts: this.maxReconnectAttempts
    });
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
    
    console.info(`👑 [SSE] Tab ${this.tabId} became LEADER`);
    
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
      console.info(`🔌 [SSE] Leader tab ${this.tabId} connecting (has ${this.listeners.size} listeners)`);
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
          console.info(`📢 [SSE] Tab ${this.tabId} stepped down - tab ${data.tabId} is leader`);
        }
        break;

      case 'LEADER_ANNOUNCEMENT':
        if (data.tabId !== this.tabId) {
          // Another tab became leader
          this.isLeaderTab = false;
          this.lastHeartbeat = data.timestamp;
          console.info(`📢 [SSE] Tab ${this.tabId} recognized new leader: ${data.tabId}`);
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
      console.info(`👁️ [SSE] Tab ${this.tabId} became HIDDEN - clearing reconnect timeout`);
      this.clearReconnectTimeout();
    } else {
      console.info(`👁️ [SSE] Tab ${this.tabId} became VISIBLE - checking connection status`);
      
      // Check if leader is still alive when tab becomes visible
      if (!this.isLeaderTab) {
        console.debug(`[SSE] Tab ${this.tabId} is not leader, checking leader health`);
        this.checkLeaderHealth();
      } else if (!this.isConnected && !this.isManuallyDisconnected && this.listeners.size > 0) {
        console.info(`🔄 [SSE] Leader tab ${this.tabId} reconnecting after becoming visible`, {
          reconnectAttempts: this.reconnectAttempts,
          adjustedAttempts: Math.max(0, this.reconnectAttempts - 2),
          listenersCount: this.listeners.size
        });
        this.reconnectAttempts = Math.max(0, this.reconnectAttempts - 2);
        this.scheduleReconnect(2000);
      } else {
        console.debug(`[SSE] Tab ${this.tabId} visibility change - no action needed:`, {
          isLeader: this.isLeaderTab,
          isConnected: this.isConnected,
          manuallyDisconnected: this.isManuallyDisconnected,
          listenersCount: this.listeners.size
        });
      }
    }
  }

  getReadyStateText(readyState) {
    switch (readyState) {
      case EventSource.CONNECTING: return 'CONNECTING';
      case EventSource.OPEN: return 'OPEN';
      case EventSource.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
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
        
        console.warn(`🚨 [SSE] Circuit breaker ACTIVATED for tab ${this.tabId}:`, {
          recentConnections: this.recentConnections.length,
          threshold: this.circuitBreakerThreshold,
          window: this.circuitBreakerWindow,
          cooldown: this.circuitBreakerCooldown,
          blockedUntil: new Date(now + this.circuitBreakerCooldown).toISOString()
        });
        
        setTimeout(() => {
          this.isCircuitBreakerOpen = false;
          this.recentConnections = [];
          this.reconnectAttempts = 0;
          console.info(`✅ [SSE] Circuit breaker DEACTIVATED for tab ${this.tabId} - connections allowed again`);
        }, this.circuitBreakerCooldown);
      }
      return true;
    }
    
    return false;
  }

  recordConnectionAttempt() {
    this.recentConnections.push(Date.now());
    console.debug(`[SSE] Connection attempt recorded for tab ${this.tabId}:`, {
      recentAttempts: this.recentConnections.length,
      threshold: this.circuitBreakerThreshold,
      window: this.circuitBreakerWindow,
      willTriggerCircuitBreaker: this.recentConnections.length >= this.circuitBreakerThreshold
    });
  }

  scheduleReconnect(customDelay = null) {
    // Only leader tab should reconnect
    if (!this.isLeaderTab) {
      console.debug(`[SSE] Reconnect skipped - not leader tab (${this.tabId})`);
      return;
    }
    
    this.clearReconnectTimeout();
    
    if (this.isManuallyDisconnected || !navigator.onLine) {
      console.debug(`[SSE] Reconnect skipped for tab ${this.tabId}:`, {
        manuallyDisconnected: this.isManuallyDisconnected,
        online: navigator.onLine
      });
      return;
    }
    
    if (document.hidden) {
      console.debug(`[SSE] Reconnect skipped - tab ${this.tabId} is hidden`);
      return;
    }

    if (this.isCircuitBreakerOpen) {
      console.warn(`🚫 [SSE] Reconnect BLOCKED by circuit breaker for tab ${this.tabId}`);
      return;
    }
    
    // Don't schedule reconnect if there's no valid token
    // since the backend requires authentication for all SSE connections
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn(`🚫 [SSE] Reconnect BLOCKED - no auth token for tab ${this.tabId}`);
      return;
    }
    
    const delay = customDelay || this.getReconnectDelay();
    
    console.info(`⏳ [SSE] Scheduling reconnect for tab ${this.tabId}:`, {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts,
      delay: delay,
      customDelay: customDelay !== null
    });
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.info(`🔄 [SSE] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} for tab ${this.tabId}`);
        this.disconnect();
        this.connect();
      } else {
        console.error(`❌ [SSE] Max reconnection attempts (${this.maxReconnectAttempts}) exceeded for tab ${this.tabId} - giving up`);
        this.clearReconnectTimeout();
      }
    }, delay);
  }

  connect() {
    // Only leader tab should maintain SSE connection
    if (!this.isLeaderTab) {
      console.debug(`[SSE] Connect skipped - not leader tab (${this.tabId})`);
      return;
    }
    
    if (this.isManuallyDisconnected || this.eventSource) {
      console.debug(`[SSE] Connect skipped for tab ${this.tabId}:`, {
        manuallyDisconnected: this.isManuallyDisconnected,
        existingConnection: !!this.eventSource
      });
      return;
    }

    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
      console.debug(`[SSE] Connect skipped - already connecting for tab ${this.tabId}`);
      return;
    }

    if (this.checkCircuitBreaker()) {
      console.warn(`🚫 [SSE] Connect BLOCKED by circuit breaker for tab ${this.tabId}`);
      return;
    }

    // Get authentication token for SSE connection
    const token = localStorage.getItem('token');
    
    // Don't attempt to connect if there's no valid token
    // since the backend requires authentication for all SSE connections
    if (!token) {
      console.warn(`🚫 [SSE] Connect BLOCKED - no auth token for tab ${this.tabId}`);
      return;
    }

    // Enhanced token validation logging
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const tokenExp = tokenPayload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = tokenExp - now;
      
      console.info(`🔐 [SSE] Token validation for tab ${this.tabId}:`, {
        tokenExpiry: new Date(tokenExp).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + ' seconds',
        isExpired: timeUntilExpiry <= 0,
        userId: tokenPayload.userId,
        username: tokenPayload.username,
        role: tokenPayload.role
      });
      
      if (timeUntilExpiry <= 0) {
        console.error(`🚫 [SSE] Token EXPIRED for tab ${this.tabId} - cannot connect`);
        return;
      }
      
      if (timeUntilExpiry < 300000) { // Less than 5 minutes
        console.warn(`⚠️ [SSE] Token expires soon for tab ${this.tabId} (${Math.round(timeUntilExpiry / 1000)}s remaining)`);
      }
    } catch (error) {
      console.error(`🚫 [SSE] Invalid token format for tab ${this.tabId}:`, error);
      return;
    }

    console.info(`🔌 [SSE] Attempting to connect tab ${this.tabId}...`);

    this.recordConnectionAttempt();

    try {
      // Create EventSource with authentication headers (using URL params since EventSource doesn't support custom headers)
      const sseUrl = new URL(`${config.backendUrl}/api/novels/sse`);
      sseUrl.searchParams.set('sessionId', this.sessionId);
      sseUrl.searchParams.set('tabId', this.tabId);
      sseUrl.searchParams.set('token', token);
      
      console.info(`🌐 [SSE] Connection details for tab ${this.tabId}:`, {
        backendUrl: config.backendUrl,
        fullUrl: sseUrl.toString().replace(/token=[^&]+/, 'token=***'),
        sessionId: this.sessionId,
        tabId: this.tabId,
        origin: window.location.origin,
        userAgent: navigator.userAgent.substring(0, 100) + '...'
      });
      
      this.eventSource = new EventSource(sseUrl.toString());
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.clearReconnectTimeout();
        console.info(`✅ [SSE] Connected successfully for tab ${this.tabId}`, {
          clientId: this.clientId,
          url: sseUrl.toString().replace(/token=[^&]+/, 'token=***'),
          readyState: this.eventSource.readyState
        });
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        
        // Enhanced error logging
        const errorDetails = {
          readyState: this.eventSource?.readyState,
          readyStateText: this.getReadyStateText(this.eventSource?.readyState),
          error: error,
          errorType: error.type || 'unknown',
          errorTarget: error.target,
          timestamp: new Date().toISOString(),
          url: sseUrl.toString().replace(/token=[^&]+/, 'token=***'),
          origin: window.location.origin,
          backendOrigin: new URL(config.backendUrl).origin
        };
        
        // Check for specific error types
        if (error.target && error.target.readyState === EventSource.CLOSED) {
          errorDetails.errorCategory = 'CONNECTION_CLOSED';
          console.error(`❌ [SSE] Connection CLOSED for tab ${this.tabId}:`, errorDetails);
        } else if (error.target && error.target.readyState === EventSource.CONNECTING) {
          errorDetails.errorCategory = 'CONNECTION_FAILED';
          console.error(`❌ [SSE] Connection FAILED for tab ${this.tabId}:`, errorDetails);
        } else {
          errorDetails.errorCategory = 'UNKNOWN_ERROR';
          console.error(`❌ [SSE] Connection error for tab ${this.tabId}:`, errorDetails);
        }
        
        // Check for CORS issues
        if (window.location.origin !== new URL(config.backendUrl).origin) {
          console.warn(`⚠️ [SSE] Cross-origin request detected for tab ${this.tabId}:`, {
            frontendOrigin: window.location.origin,
            backendOrigin: new URL(config.backendUrl).origin,
            potentialCorsIssue: true
          });
        }
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.info(`🔄 [SSE] Connection closed, scheduling reconnect for tab ${this.tabId}`);
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Don't schedule another reconnect if still trying to connect
          console.debug(`[SSE] Still connecting for tab ${this.tabId}, not scheduling reconnect`);
        } else {
          if (this.eventSource?.readyState !== EventSource.CONNECTING) {
            console.info(`🔄 [SSE] Unexpected state, scheduling reconnect for tab ${this.tabId}`);
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
          console.warn(`🚨 [SSE] Duplicate connection detected by server for tab ${this.tabId}:`, data);
          
          this.isManuallyDisconnected = true;
          this.clearReconnectTimeout();
          this.reconnectAttempts = 0;
          this.isCircuitBreakerOpen = true;
          
          const delayTime = 20000;
          
          console.warn(`⏸️ [SSE] Tab ${this.tabId} blocked for ${delayTime/1000} seconds due to duplicate connection`);
          
          setTimeout(() => {
            this.isManuallyDisconnected = false;
            this.isCircuitBreakerOpen = false;
            this.recentConnections = [];
            
            console.info(`🔓 [SSE] Tab ${this.tabId} unblocked after duplicate connection timeout`);
            
            if (this.listeners.size > 0 && !document.hidden && this.isLeaderTab) {
              console.info(`🔄 [SSE] Attempting reconnect after duplicate timeout for tab ${this.tabId}`);
              setTimeout(() => {
                if (!this.eventSource && !this.isManuallyDisconnected) {
                  this.connect();
                }
              }, 3000);
            }
          }, delayTime);
        } catch (error) {
          console.error(`[SSE] Error processing duplicate_connection event for tab ${this.tabId}:`, error);
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
    
    // Only reconnect if authenticated
    const token = localStorage.getItem('token');
    if (!token) return;
    
    this.isManuallyDisconnected = false;
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  // Method to be called when user logs in to establish SSE connection
  onLogin() {
    // Reset any previous manual disconnection state
    this.isManuallyDisconnected = false;
    this.reconnectAttempts = 0;
    
    // If we're the leader tab and have listeners, connect
    if (this.isLeaderTab && this.listeners.size > 0 && !this.isConnected) {
      this.connect();
    }
  }

  // Method to be called when user logs out to disconnect SSE
  onLogout() {
    this.disconnect(true);
  }



  addEventListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    // If this is the first listener and we're leader, connect (only if authenticated)
    if (!this.isConnected && !this.isManuallyDisconnected && this.isLeaderTab) {
      const token = localStorage.getItem('token');
      if (token) {
        this.connect();
      }
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

  // Debug method to check current state
  getDebugInfo() {
    const now = Date.now();
    const recentConnectionsInWindow = this.recentConnections.filter(
      timestamp => now - timestamp < this.circuitBreakerWindow
    );
    
    // Enhanced token info
    let tokenInfo = null;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const tokenExp = tokenPayload.exp * 1000;
        tokenInfo = {
          userId: tokenPayload.userId,
          username: tokenPayload.username,
          role: tokenPayload.role,
          expiresAt: new Date(tokenExp).toISOString(),
          timeUntilExpiry: Math.round((tokenExp - now) / 1000) + ' seconds',
          isExpired: tokenExp <= now
        };
      }
    } catch (error) {
      tokenInfo = { error: 'Invalid token format' };
    }
    
    return {
      tabId: this.tabId,
      sessionId: this.sessionId,
      isLeaderTab: this.isLeaderTab,
      isConnected: this.isConnected,
      isManuallyDisconnected: this.isManuallyDisconnected,
      isCircuitBreakerOpen: this.isCircuitBreakerOpen,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      recentConnectionsCount: recentConnectionsInWindow.length,
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      willTriggerCircuitBreaker: recentConnectionsInWindow.length >= this.circuitBreakerThreshold,
      tokenInfo: tokenInfo,
      networkInfo: {
        isOnline: navigator.onLine,
        connectionType: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || 'unknown',
        rtt: navigator.connection?.rtt || 'unknown'
      },
      isTabHidden: document.hidden,
      listeners: Array.from(this.listeners.keys()),
      eventSourceState: this.eventSource ? this.eventSource.readyState : null,
      eventSourceStateText: this.eventSource ? this.getReadyStateText(this.eventSource.readyState) : null,
      backendUrl: config.backendUrl,
      origin: window.location.origin,
      backendOrigin: new URL(config.backendUrl).origin,
      isCrossOrigin: window.location.origin !== new URL(config.backendUrl).origin,
      eventSourceStates: {
        CONNECTING: EventSource.CONNECTING,
        OPEN: EventSource.OPEN, 
        CLOSED: EventSource.CLOSED
      }
    };
  }
}

// Create a singleton instance
const sseService = new SSEService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sseService.destroy();
});

export default sseService; 