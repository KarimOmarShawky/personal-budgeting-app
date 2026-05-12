import mongoose from 'mongoose';
import { CONFIG } from '../config/env';

/**
 * Connect to MongoDB.
 *
 * - If MONGODB_URI is set to a real mongodb://... or mongodb+srv://... URL,
 *   connect to that.
 * - Otherwise (or when MONGODB_URI === "memory"), spin up an in-memory
 *   MongoDB via `mongodb-memory-server`. Great for trying the app without
 *   installing or signing up for anything.
 */
export async function connectToDatabase(): Promise<void> {
  let uri = CONFIG.MONGODB_URI;
  const wantsMemory =
    !uri ||
    uri === 'memory' ||
    process.env.USE_MEMORY_DB === '1';

  if (wantsMemory) {
    // Lazy-require so production installs that skip dev deps don't break.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log('🧠 Using in-memory MongoDB (data resets on restart).');
    console.log(`   URI: ${uri}`);
  }

  await mongoose.connect(uri);
}
