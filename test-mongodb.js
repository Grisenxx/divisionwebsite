// Test MongoDB forbindelse
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI mangler i .env.local');
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('Forsøger at forbinde til MongoDB...');
    await client.connect();
    console.log('✅ Forbindelse til MongoDB lykkedes!');
    
    // Test database adgang
    const db = client.db('division');
    const collections = await db.listCollections().toArray();
    console.log('📄 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ MongoDB forbindelse fejlet:', error);
  } finally {
    await client.close();
  }
}

testConnection();