// Network management using PeerJS for WebRTC connection
class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isDesktop = !this.isMobileDevice();
        this.peerId = null;
        this.accessCode = null;
        this.connected = false;
        this.onConnectionCallback = null;
        this.onDataCallback = null;
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    init() {
        return new Promise((resolve, reject) => {
            if (this.isDesktop) {
                this.initDesktop(resolve, reject);
            } else {
                this.initMobile(resolve, reject);
            }
        });
    }

    initDesktop(resolve, reject) {
        // Generate a random 4-digit code
        this.accessCode = Math.floor(1000 + Math.random() * 9000).toString();

        // Create a peer ID based on the access code
        this.peerId = 'lighthouse-' + this.accessCode;

        this.peer = new Peer(this.peerId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('Desktop peer opened with ID:', id);
            resolve({ accessCode: this.accessCode, peerId: id });
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from mobile');
            this.conn = conn;
            this.setupConnection();
        });

        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
            reject(error);
        });
    }

    initMobile(resolve, reject) {
        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('Mobile peer opened with ID:', id);
            this.peerId = id;
            resolve({ peerId: id });
        });

        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
            reject(error);
        });
    }

    connectToDesktop(accessCode) {
        return new Promise((resolve, reject) => {
            const desktopPeerId = 'lighthouse-' + accessCode;
            console.log('Attempting to connect to:', desktopPeerId);

            this.conn = this.peer.connect(desktopPeerId, {
                reliable: true
            });

            this.conn.on('open', () => {
                console.log('Connection established!');
                this.connected = true;
                this.setupConnection();
                resolve();
            });

            this.conn.on('error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
        });
    }

    setupConnection() {
        this.connected = true;

        this.conn.on('data', (data) => {
            if (this.onDataCallback) {
                this.onDataCallback(data);
            }
        });

        this.conn.on('close', () => {
            console.log('Connection closed');
            this.connected = false;
            if (this.onConnectionCallback) {
                this.onConnectionCallback(false);
            }
        });

        if (this.onConnectionCallback) {
            this.onConnectionCallback(true);
        }
    }

    send(data) {
        if (this.conn && this.connected) {
            this.conn.send(data);
        }
    }

    onConnection(callback) {
        this.onConnectionCallback = callback;
    }

    onData(callback) {
        this.onDataCallback = callback;
    }

    getAccessCode() {
        return this.accessCode;
    }

    isConnected() {
        return this.connected;
    }
}
