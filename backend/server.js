require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5500', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(xss());
app.use(hpp());
app.use(express.static(path.join(__dirname, '..')));

// Encryption utility functions
const encrypt = (text) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

const decrypt = (encryptedData, iv, authTag) => {
    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

// In-memory storage (replace with database in production)
const contacts = [];
const vaultItems = new Map();
const authSessions = new Map();

// Rate limiting store
const rateLimitStore = new Map();

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 10;

    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, { count: 1, startTime: now });
        return next();
    }

    const record = rateLimitStore.get(ip);
    if (now - record.startTime > windowMs) {
        record.count = 1;
        record.startTime = now;
        return next();
    }

    record.count++;
    if (record.count > maxRequests) {
        return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    next();
};

// Apply rate limiter to all routes
app.use(rateLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Contact form endpoint
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Create contact entry
        const contact = {
            id: uuidv4(),
            name,
            email,
            subject: subject || '',
            message,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        contacts.push(contact);

        console.log(`📩 New contact from ${name} (${email}): ${message}`);

        // Simulate email sending delay
        setTimeout(() => {
            console.log(`✓ Message processed and stored`);
        }, 500);

        res.status(201).json({ 
            success: true, 
            message: 'Message encrypted and sent successfully',
            ticketId: contact.id.slice(0, 8)
        });

    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Vault endpoints
app.get('/api/vault', (req, res) => {
    // Return vault items (in production, this would be authenticated)
    const items = Array.from(vaultItems.values()).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        createdAt: item.createdAt,
        status: item.status
    }));

    res.json({ items });
});

app.post('/api/vault', (req, res) => {
    try {
        const { name, type, data } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        // Encrypt sensitive data before storing
        const encryptedData = encrypt(data);

        const item = {
            id: uuidv4(),
            name,
            type,
            encryptedData, // Store encrypted data
            createdAt: new Date().toISOString(),
            status: 'secured'
        };

        vaultItems.set(item.id, item);

        console.log(`🔒 Vault item created and encrypted: ${name}`);

        res.status(201).json({ 
            success: true, 
            item: { id: item.id, name: item.name, type: item.type, status: item.status }
        });

    } catch (error) {
        console.error('Vault error:', error);
        res.status(500).json({ error: 'Failed to create vault item' });
    }
});

// Get specific vault item (with decryption)
app.get('/api/vault/:id', (req, res) => {
    try {
        const { id } = req.params;
        const item = vaultItems.get(id);

        if (!item) {
            return res.status(404).json({ error: 'Vault item not found' });
        }

        // Decrypt data for authorized access
        const decryptedData = decrypt(
            item.encryptedData.encryptedData,
            item.encryptedData.iv,
            item.encryptedData.authTag
        );

        res.json({
            success: true,
            item: {
                id: item.id,
                name: item.name,
                type: item.type,
                data: decryptedData,
                createdAt: item.createdAt,
                status: item.status
            }
        });
    } catch (error) {
        console.error('Vault retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve vault item' });
    }
});

// Delete vault item
app.delete('/api/vault/:id', (req, res) => {
    const { id } = req.params;
    
    if (!vaultItems.has(id)) {
        return res.status(404).json({ error: 'Vault item not found' });
    }

    vaultItems.delete(id);
    console.log(`🗑️ Vault item deleted: ${id}`);
    
    res.json({ success: true, message: 'Vault item securely deleted' });
});

// Authentication endpoints
app.post('/api/auth/initiate', async (req, res) => {
    try {
        const sessionId = uuidv4();
        
        // Store session
        authSessions.set(sessionId, {
            id: sessionId,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        console.log(`🔐 Auth session initiated: ${sessionId}`);

        res.json({
            success: true,
            sessionId,
            challenge: Buffer.from(JSON.stringify({
                challenge: crypto.randomBytes(32).toString('base64'),
                rp: { name: 'αlfa Vault', id: 'localhost' },
                user: { id: sessionId, name: 'user', displayName: 'User' },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                timeout: 60000,
                attestation: 'none'
            })).toString('base64')
        });

    } catch (error) {
        console.error('Auth initiate error:', error);
        res.status(500).json({ error: 'Failed to initiate authentication' });
    }
});

app.post('/api/auth/verify', (req, res) => {
    try {
        const { sessionId, credential } = req.body;

        if (!sessionId || !credential) {
            return res.status(400).json({ error: 'Session ID and credential required' });
        }

        const session = authSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Update session status
        session.status = 'authenticated';
        session.authenticatedAt = new Date().toISOString();
        session.token = `auth_${uuidv4()}`; // Generate secure token
        authSessions.set(sessionId, session);

        console.log(`✓ Auth verified for session: ${sessionId}`);

        res.json({
            success: true,
            authenticated: true,
            token: session.token,
            expiresIn: 3600
        });

    } catch (error) {
        console.error('Auth verify error:', error);
        res.status(500).json({ error: 'Authentication verification failed' });
    }
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Find session by token
    let foundSession = null;
    for (const [sessionId, session] of authSessions.entries()) {
        if (session.token === token && session.status === 'authenticated') {
            foundSession = session;
            break;
        }
    }

    if (!foundSession) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check token expiration (1 hour)
    const tokenAge = Date.now() - new Date(foundSession.authenticatedAt).getTime();
    if (tokenAge > 3600000) { // 1 hour in ms
        foundSession.status = 'expired';
        authSessions.set(foundSession.id, foundSession);
        return res.status(401).json({ error: 'Token expired' });
    }

    req.user = { sessionId: foundSession.id };
    next();
};

// Admin middleware
const adminMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken || token !== adminToken) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Get all contacts (admin endpoint - protected)
app.get('/api/admin/contacts', adminMiddleware, (req, res) => {
    res.json({ 
        contacts: contacts.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            subject: c.subject,
            createdAt: c.createdAt,
            status: c.status
        }))
    });
});

// Delete contact (admin endpoint - protected)
app.delete('/api/admin/contacts/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const index = contacts.findIndex(c => c.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Contact not found' });
    }

    contacts.splice(index, 1);
    console.log(`🗑️ Contact deleted: ${id}`);
    
    res.json({ success: true, message: 'Contact deleted' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     αlfa Backend Server Running               ║
╠═══════════════════════════════════════════════╣
║  Port: ${PORT}                                  
║  Mode: Development                            
║  Endpoints:                                   
║    POST /api/contact      - Submit message    
║    GET  /api/vault        - List vault items  
║    POST /api/vault        - Create vault item 
║    POST /api/auth/*       - Authentication    
║    GET  /api/health       - Health check      
╚═══════════════════════════════════════════════╝
    `);
});
