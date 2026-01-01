import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// User Model - Anonymous tracking via device_id
const User = sequelize.define('User', {
  device_id: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    allowNull: false
  }
}, {
  tableName: 'Users',
  timestamps: true
});

// BookStats Model - Tracking events
const BookStats = sequelize.define('BookStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  device_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    references: {
      model: User,
      key: 'device_id'
    }
  },
  book_title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  event_type: {
    type: DataTypes.ENUM('upload_started', 'daily_goal_reached', 'freedom_stage_reached'),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'BookStats',
  timestamps: false
});

// Associations
User.hasMany(BookStats, { foreignKey: 'device_id', sourceKey: 'device_id' });
BookStats.belongsTo(User, { foreignKey: 'device_id', targetKey: 'device_id' });

export { sequelize, User, BookStats };
