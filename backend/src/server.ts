import express from 'express';
import cors from 'cors';
import { db } from './config/database';
import chatRoutes from './routes/chat';
import profileRoutes from './routes/profile';
import ragRoutes from './routes/rag';
import { llmLocalService } from './services/llmLocal';
import { ollamaService } from './services/ollamaService';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const STORE_MODE = process.env.STORE_MODE || 'memory';
const WARMUP_MODEL = process.env.OLLAMA_WARMUP !== 'false'; // Activer le warmup par défaut

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/profile', ragRoutes);
// Mount indexing-jobs route at root level for direct access
app.use('/api', ragRoutes);

// Health check
app.get('/health', async (req, res) => {
  const llmStatus = await llmLocalService.getStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storeMode: STORE_MODE,
    database: STORE_MODE === 'postgres' ? db.isReady() : 'N/A',
    llm: {
      ollamaAvailable: llmStatus.ollamaAvailable,
      models: llmStatus.models,
      source: llmStatus.ollamaAvailable ? 'ollama' : 'stub',
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database if using postgres
async function initializeDatabase() {
  if (STORE_MODE === 'postgres') {
    try {
      await db.connect();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      console.error('   Cannot start server in POSTGRES mode without a working database.');
      throw error; // Let startServer fail instead of silently falling back to memory
    }
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, async () => {
      console.log('='.repeat(50));
      console.log(`🚀 Backend server started`);
      console.log(`📡 Listening on http://localhost:${PORT}`);
      console.log(`📦 Store mode: ${STORE_MODE.toUpperCase()}`);
      console.log(`📋 API endpoints:`);
      console.log(`   - POST   /api/chat/send`);
      console.log(`   - GET    /api/chat/session/:id`);
      console.log(`   - POST   /api/profile`);
      console.log(`   - GET    /api/profile`);
      console.log(`   - GET    /api/profile/:id`);
      console.log(`   - POST   /api/profile/:profileId/resources/upload`);
      console.log(`   - POST   /api/profile/:profileId/resources/text`);
      console.log(`   - GET    /api/profile/:profileId/resources`);
      console.log(`   - DELETE /api/profile/:profileId/resources/:resourceId`);
      console.log(`   - POST   /api/profile/:profileId/index`);
      console.log(`   - GET    /api/indexing-jobs/:jobId`);
      console.log(`   - POST   /api/profile/:profileId/rag/search`);
      console.log(`   - GET    /health`);
      console.log('='.repeat(50));

      // Warmup du modèle LLM en arrière-plan pour éviter le cold start
      if (WARMUP_MODEL) {
        console.log('\n🔥 Starting LLM model warmup in background...');
        ollamaService.warmup().then((success) => {
          if (success) {
            console.log('✅ LLM model is ready for fast responses!');
          } else {
            console.log('⚠️  LLM warmup failed - first request may be slow');
          }
        }).catch((err) => {
          console.error('❌ LLM warmup error:', err);
        });
      }
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
