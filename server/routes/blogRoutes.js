// server/routes/blogRoutes.js
const express = require('express');
const router = express.Router();
const { BlogPost, Category, User } = require('../models');
const { authenticateToken, requireDoctor } = require('../middleware/auth');
const upload = require('../config/upload');
const { body, validationResult } = require('express-validator');

// Utility function to truncate summary to 15 words
const truncateSummary = (summary, wordLimit = 15) => {
  const words = summary.split(' ');
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(' ') + '...';
  }
  return summary;
};

// GET /api/blog/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'description']
    });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// POST /api/blog/posts - Create new blog post (Doctor only)
router.post('/posts', 
  authenticateToken,
  requireDoctor,
  upload.single('image'),
  [
    body('title').trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters long'),
    body('summary').trim().isLength({ min: 10 }).withMessage('Summary must be at least 10 characters long'),
    body('content').trim().isLength({ min: 50 }).withMessage('Content must be at least 50 characters long'),
    body('category_id').isInt().withMessage('Category ID must be a valid integer'),
    body('is_draft').optional().isBoolean().withMessage('is_draft must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, summary, content, category_id, is_draft = false } = req.body;
      const image_url = req.file ? `/uploads/blog-images/${req.file.filename}` : null;

      // Verify category exists
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const blogPost = await BlogPost.create({
        title,
        summary,
        content,
        image_url,
        category_id,
        author_id: req.user.id,
        is_draft: is_draft === 'true' || is_draft === true
      });

      res.status(201).json({
        success: true,
        message: 'Blog post created successfully',
        data: blogPost
      });
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create blog post'
      });
    }
  }
);

// GET /api/blog/posts/my-posts - Get posts by logged-in doctor
router.get('/posts/my-posts', 
  authenticateToken,
  requireDoctor,
  async (req, res) => {
    try {
      const posts = await BlogPost.findAll({
        where: { author_id: req.user.id },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: posts
      });
    } catch (error) {
      console.error('Error fetching doctor posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your posts'
      });
    }
  }
);

// GET /api/blog/posts - Get all published posts (for patients)
router.get('/posts', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    const whereClause = { is_draft: false };
    if (category_id) {
      whereClause.category_id = category_id;
    }

    const posts = await BlogPost.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Truncate summaries to 15 words
    const formattedPosts = posts.map(post => ({
      ...post.toJSON(),
      summary: truncateSummary(post.summary, 15)
    }));

    res.json({
      success: true,
      data: formattedPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
});

// GET /api/blog/posts/by-category - Get posts grouped by category
router.get('/posts/by-category', async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: BlogPost,
          as: 'posts',
          where: { is_draft: false },
          required: false,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'full_name']
            }
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    // Format the response with truncated summaries
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      posts: category.posts.map(post => ({
        ...post.toJSON(),
        summary: truncateSummary(post.summary, 15)
      }))
    }));

    res.json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts by category'
    });
  }
});

// GET /api/blog/posts/:id - Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name']
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Don't show draft posts to non-authors
    if (post.is_draft && (!req.user || req.user.id !== post.author_id)) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
});

// PUT /api/blog/posts/:id - Update blog post (Doctor only, own posts)
router.put('/posts/:id',
  authenticateToken,
  requireDoctor,
  upload.single('image'),
  [
    body('title').optional().trim().isLength({ min: 5 }),
    body('summary').optional().trim().isLength({ min: 10 }),
    body('content').optional().trim().isLength({ min: 50 }),
    body('category_id').optional().isInt(),
    body('is_draft').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const post = await BlogPost.findByPk(req.params.id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if the doctor owns this post
      if (post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own posts'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.summary) updateData.summary = req.body.summary;
      if (req.body.content) updateData.content = req.body.content;
      if (req.body.category_id) updateData.category_id = req.body.category_id;
      if (req.body.is_draft !== undefined) updateData.is_draft = req.body.is_draft === 'true' || req.body.is_draft === true;
      if (req.file) updateData.image_url = `/uploads/blog-images/${req.file.filename}`;

      await post.update(updateData);

      res.json({
        success: true,
        message: 'Post updated successfully',
        data: post
      });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update post'
      });
    }
  }
);

// DELETE /api/blog/posts/:id - Delete blog post (Doctor only, own posts)
router.delete('/posts/:id',
  authenticateToken,
  requireDoctor,
  async (req, res) => {
    try {
      const post = await BlogPost.findByPk(req.params.id);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if the doctor owns this post
      if (post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own posts'
        });
      }

      await post.destroy();

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete post'
      });
    }
  }
);

module.exports = router;