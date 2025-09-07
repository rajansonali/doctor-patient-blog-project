require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('Starting Doctor-Patient Blog Server...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const { User } = require('./models');
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Basic route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Doctor-Patient Blog API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      categories: 'GET /api/blog/categories',
      posts: 'GET /api/blog/posts',
      createPost: 'POST /api/blog/posts (Doctor only)',
      myPosts: 'GET /api/blog/posts/my-posts (Doctor only)'
    }
  });
});

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, username, email, password, role } = req.body;

    if (!full_name || !username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const { User } = require('./models');
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name, username, email,
      password: hashedPassword, role
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role }, token }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ success: false, message: 'Login and password required' });
    }

    const { User } = require('./models');
    const user = await User.findOne({ 
      where: { 
        [require('sequelize').Op.or]: [{ email: login }, { username: login }]
      } 
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
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
      data: { user: { id: user.id, full_name: user.full_name, username: user.username, role: user.role }, token }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// BLOG ROUTES
app.get('/api/blog/categories', async (req, res) => {
  try {
    const { Category } = require('./models');
    const categories = await Category.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

app.post('/api/blog/posts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can create posts' });
    }

    const { title, summary, content, category_id, is_draft = false } = req.body;

    if (!title || !summary || !content || !category_id) {
      return res.status(400).json({ success: false, message: 'Title, summary, content, and category are required' });
    }

    const { BlogPost } = require('./models');
    const post = await BlogPost.create({
      title, summary, content, category_id,
      author_id: req.user.id,
      is_draft: is_draft === 'true' || is_draft === true
    });

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: post
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

app.get('/api/blog/posts/my-posts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can view their posts' });
    }

    const { BlogPost, Category } = require('./models');
    const posts = await BlogPost.findAll({
      where: { author_id: req.user.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: posts });

  } catch (error) {
    console.error('Fetch my posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

app.get('/api/blog/posts', async (req, res) => {
  try {
    const { category_id } = req.query;
    const { BlogPost, Category, User } = require('./models');
    
    const whereClause = { is_draft: false };
    if (category_id) whereClause.category_id = category_id;

    const posts = await BlogPost.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'author', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Truncate summaries to 15 words
    const formattedPosts = posts.map(post => {
      const words = post.summary.split(' ');
      const truncatedSummary = words.length > 15 
        ? words.slice(0, 15).join(' ') + '...' 
        : post.summary;
      
      return { ...post.toJSON(), summary: truncatedSummary };
    });

    res.json({ success: true, data: formattedPosts });

  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

app.get('/api/blog/posts/by-category', async (req, res) => {
  try {
    const { Category, BlogPost, User } = require('./models');
    const categories = await Category.findAll({
      include: [{
        model: BlogPost, as: 'posts',
        where: { is_draft: false },
        required: false,
        include: [{ model: User, as: 'author', attributes: ['id', 'full_name'] }],
        order: [['created_at', 'DESC']]
      }]
    });

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      posts: category.posts.map(post => {
        const words = post.summary.split(' ');
        const truncatedSummary = words.length > 15 
          ? words.slice(0, 15).join(' ') + '...' 
          : post.summary;
        return { ...post.toJSON(), summary: truncatedSummary };
      })
    }));

    res.json({ success: true, data: formattedCategories });

  } catch (error) {
    console.error('Fetch posts by category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts by category' });
  }
});

// Database initialization
const initializeDatabase = async () => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Start server
const startServer = async () => {
  const dbConnected = await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('🔐 Auth: /api/auth/register, /api/auth/login');
    console.log('📝 Blog: /api/blog/posts, /api/blog/categories');
    if (dbConnected) {
      console.log('📊 Database ready for blog operations');
    }
  });
};

startServer();