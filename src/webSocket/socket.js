import io from 'socket.io-client';

class SocketService {
  socket = null;
  _userId = null;
  _onNotification = null;
  _onConnect = null; // ← new
  _onDisconnect = null; // ← new

  connect(userId, onNotification, onConnect, onDisconnect) {
    if (this.socket?.connected && this._userId === userId) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this._userId = userId;
    this._onNotification = onNotification;
    this._onConnect = onConnect; // ← store
    this._onDisconnect = onDisconnect; // ← store

    this.socket = io('https://limpopo.maxtraserver.in/', {
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.socket.emit('join', { user_id: userId, rooms: [] });
      this._onConnect?.(); // ← fire connect callback
    });

    this.socket.on('notification', data => {
      console.log('[Socket] Notification:', JSON.stringify(data));
      this._onNotification?.(data);
    });

    this.socket.on('disconnect', reason => {
      console.log('[Socket] Disconnected:', reason);
      this._onDisconnect?.(); // ← fire disconnect callback
      if (reason === 'io server disconnect') {
        setTimeout(() => this.socket?.connect(), 3000);
      }
    });

    this.socket.on('reconnect_attempt', attempt => {
      console.log('[Socket] Reconnecting... attempt:', attempt);
    });

    this.socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      this.socket.emit('join', { user_id: this._userId, rooms: [] });
      this._onConnect?.(); // ← fire on reconnect too
    });

    this.socket.on('connect_error', err => {
      console.log('[Socket] Connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this._userId = null;
      this._onNotification = null;
      this._onConnect = null;
      this._onDisconnect = null;
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Emit blocked — not connected:', event);
    }
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }

  getSocketId() {
    return this.socket?.id ?? null;
  }
}

export default new SocketService();
