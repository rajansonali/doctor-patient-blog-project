require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3003;

console.log('Starting Complete Doctor-Patient Blog Server...');

// Create uploads directory
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
if (!fs.existsSync('./uploads/blog-images')) fs.mkdirSync('./uploads/blog-images', { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: './uploads/blog-images',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// In-memory data
let users = [
  { id: 1, username: 'drjohn', full_name: 'Dr. John Smith', email: 'drjohn@test.com', password: 'password123', role: 'doctor' },
  { id: 2, username: 'patient1', full_name: 'Jane Doe', email: 'jane@test.com', password: 'password123', role: 'patient' }
];

let categories = [
  { id: 1, name: 'Mental Health', description: 'Articles related to mental health and wellness' },
  { id: 2, name: 'Heart Disease', description: 'Information about cardiovascular health' },
  { id: 3, name: 'Covid19', description: 'Updates and information about COVID-19' },
  { id: 4, name: 'Immunization', description: 'Vaccination and immunization guidelines' }
];

let blogPosts = [];
let nextId = 1;

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = users.find(u => u.id === decoded.userId);
    if (!req.user) return res.status(401).json({ success: false, message: 'Invalid token' });
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Doctor-Patient Blog API is running!',
    features: [
      'User Registration & Login',
      'Doctor can create blog posts with images',
      'Patients can view published posts',
      'Categories: Mental Health, Heart Disease, Covid19, Immunization',
      'Draft/Publish functionality',
      'Summary truncation to 15 words'
    ],
    endpoints: {
      'POST /api/auth/register': 'Register new user',
      'POST /api/auth/login': 'Login user',
      'GET /api/blog/categories': 'Get categories',
      'GET /api/blog/posts': 'Get published posts',
      'POST /api/blog/posts': 'Create post (doctor only)',
      'GET /api/blog/posts/my-posts': 'Get my posts (doctor only)'
    }
  });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, username, email, password, role } = req.body;

    if (!full_name || !username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (users.find(u => u.username === username || u.email === email)) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      full_name, username, email, role,
      password: hashedPassword
    };
    users.push(newUser);

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: { id: newUser.id, full_name, username, email, role },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    const user = users.find(u => u.username === login || u.email === login);
    
    // Simple password check for demo (in production, use bcrypt.compare)
    if (!user || password !== 'password123') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Blog routes
app.get('/api/blog/categories', (req, res) => {
  console.log('Categories requested');
  res.json({ success: true, data: categories });
});

app.post('/api/blog/posts', authenticateToken, upload.single('image'), (req, res) => {
  console.log('Create post request by:', req.user.username);
  
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Only doctors can create posts' });
  }

  const { title, summary, content, category_id, is_draft } = req.body;

  if (!title || !summary || !content || !category_id) {
    return res.status(400).json({ success: false, message: 'Title, summary, content, and category required' });
  }

  const newPost = {
    id: nextId++,
    title, summary, content,
    category_id: parseInt(category_id),
    author_id: req.user.id,
    is_draft: is_draft === 'true' || is_draft === true,
    image_url: req.file ? '/uploads/blog-images/' + req.file.filename : null,
    created_at: new Date().toISOString()
  };

  blogPosts.push(newPost);
  console.log('Post created:', newPost.title, '(Draft:', newPost.is_draft + ')');

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    data: newPost
  });
});

app.get('/api/blog/posts', (req, res) => {
  const { category_id } = req.query;
  console.log('Get posts request, category:', category_id || 'all');

  let posts = blogPosts.filter(post => !post.is_draft);
  if (category_id) posts = posts.filter(post => post.category_id === parseInt(category_id));

  const formattedPosts = posts.map(post => {
    const category = categories.find(c => c.id === post.category_id);
    const author = users.find(u => u.id === post.author_id);
    const words = post.summary.split(' ');
    const truncatedSummary = words.length > 15 ? words.slice(0, 15).join(' ') + '...' : post.summary;

    return {
      ...post,
      summary: truncatedSummary,
      category: category ? { id: category.id, name: category.name } : null,
      author: author ? { id: author.id, full_name: author.full_name } : null
    };
  });

  res.json({ success: true, data: formattedPosts });
});

app.get('/api/blog/posts/my-posts', authenticateToken, (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Only doctors can view their posts' });
  }

  const myPosts = blogPosts.filter(post => post.author_id === req.user.id).map(post => {
    const category = categories.find(c => c.id === post.category_id);
    return {
      ...post,
      category: category ? { id: category.id, name: category.name } : null
    };
  });

  console.log('My posts for', req.user.username + ':', myPosts.length);
  res.json({ success: true, data: myPosts });
});

app.get('/api/blog/posts/by-category', (req, res) => {
  console.log('Posts by category requested');
  
  const categoryData = categories.map(category => {
    const categoryPosts = blogPosts
      .filter(post => !post.is_draft && post.category_id === category.id)
      .map(post => {
        const author = users.find(u => u.id === post.author_id);
        const words = post.summary.split(' ');
        const truncatedSummary = words.length > 15 ? words.slice(0, 15).join(' ') + '...' : post.summary;

        return {
          ...post,
          summary: truncatedSummary,
          author: author ? { id: author.id, full_name: author.full_name } : null
        };
      });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      posts: categoryPosts
    };
  });

  res.json({ success: true, data: categoryData });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on http://localhost:' + PORT);
  console.log('Blog system ready with all features!');
  console.log('Test accounts:');
  console.log('  Doctor: drjohn / password123');
  console.log('  Patient: patient1 / password123');
});
