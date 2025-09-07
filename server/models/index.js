const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// User Model (matches your existing database)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  full_name: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('doctor', 'patient'),
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: false
});

// Category Model
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'categories',
  timestamps: false
});

// BlogPost Model
const BlogPost = sequelize.define('BlogPost', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING(500)
  },
  is_draft: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'blog_posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define Associations
BlogPost.belongsTo(User, { 
  foreignKey: 'author_id', 
  as: 'author' 
});

BlogPost.belongsTo(Category, { 
  foreignKey: 'category_id', 
  as: 'category' 
});

User.hasMany(BlogPost, { 
  foreignKey: 'author_id', 
  as: 'posts' 
});

Category.hasMany(BlogPost, { 
  foreignKey: 'category_id', 
  as: 'posts' 
});

module.exports = {
  User,
  Category,
  BlogPost,
  sequelize
};