import type { Express, RequestHandler } from 'express';
import session from 'express-session';
import { MemoryStore } from 'express-session';

const users = [
  { username: 'Apsort', password: '129900' }
];

export function setupAuth(app: Express) {
  // Session configuration
  app.use(session({
    secret: 'isbn-search-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore(),
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Login route
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      (req.session as any).user = { username: user.username };
      res.json({ success: true, message: 'Giriş başarılı' });
    } else {
      res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ success: false, message: 'Çıkış yapılamadı' });
      } else {
        res.json({ success: true, message: 'Çıkış yapıldı' });
      }
    });
  });

  // Check auth status
  app.get('/api/auth/user', (req, res) => {
    if ((req.session as any).user) {
      res.json({ user: (req.session as any).user });
    } else {
      res.status(401).json({ message: 'Giriş yapılmamış' });
    }
  });
}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  if ((req.session as any).user) {
    next();
  } else {
    res.status(401).json({ message: 'Giriş yapmanız gerekiyor' });
  }
};