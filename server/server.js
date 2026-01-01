import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, User, BookStats } from './models/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// POST /api/track - Track user events
app.post('/api/track', async (req, res) => {
  try {
    const { device_id, book_title, event_type } = req.body;

    // Validate required fields
    if (!device_id || !book_title || !event_type) {
      return res.status(400).json({
        error: 'Missing required fields: device_id, book_title, event_type'
      });
    }

    // Validate event_type
    const validEvents = ['upload_started', 'daily_goal_reached', 'freedom_stage_reached'];
    if (!validEvents.includes(event_type)) {
      return res.status(400).json({
        error: `Invalid event_type. Must be one of: ${validEvents.join(', ')}`
      });
    }

    // Find or create user
    await User.findOrCreate({
      where: { device_id },
      defaults: { device_id }
    });

    // Create the stat entry
    const stat = await BookStats.create({
      device_id,
      book_title,
      event_type,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      stat_id: stat.id
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats - Admin stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalUploads,
      totalDailyGoals,
      totalHabitsMastered
    ] = await Promise.all([
      User.count(),
      BookStats.count({ where: { event_type: 'upload_started' } }),
      BookStats.count({ where: { event_type: 'daily_goal_reached' } }),
      BookStats.count({ where: { event_type: 'freedom_stage_reached' } })
    ]);

    res.json({
      total_unique_users: totalUsers,
      total_uploads: totalUploads,
      total_daily_goals_met: totalDailyGoals,
      total_habits_mastered: totalHabitsMastered
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync();
    console.log('Database synchronized.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
