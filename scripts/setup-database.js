// Database setup script - Kør denne fil for at oprette collections og indekser
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

// Load environment variabler
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = "divisionhjemmeside"

async function setupDatabase() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI ikke fundet!")
    console.error("Opret en .env.local fil i projektets rod med:")
    console.error("MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/divisionhjemmeside")
    process.exit(1)
  }

  console.log("🚀 Starter database opsætning...")
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log("✅ Forbundet til MongoDB")
    
    const db = client.db(DATABASE_NAME)
    
    // Opret applications collection
    const applicationsCollection = db.collection("applications")
    
    // Opret indekser for bedre performance
    await applicationsCollection.createIndex({ "id": 1 }, { unique: true })
    await applicationsCollection.createIndex({ "discordId": 1 })
    await applicationsCollection.createIndex({ "type": 1 })
    await applicationsCollection.createIndex({ "status": 1 })
    await applicationsCollection.createIndex({ "createdAt": 1 })
    
    console.log("✅ Oprettet indekser for applications collection")
    
    // Tjek antallet af eksisterende ansøgninger
    const existingApps = await applicationsCollection.countDocuments()
    console.log(`ℹ️  Der er ${existingApps} ansøgninger i databasen`)
    
    // Vis database statistik
    console.log("\n📊 Database Oversigt:")
    console.log(`Database navn: ${DATABASE_NAME}`)
    console.log(`Collections:`)
    
    const collections = await db.listCollections().toArray()
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments()
      console.log(`  - ${collection.name}: ${count} dokumenter`)
    }
    
    // Vis indekser
    console.log(`\n🔍 Indekser i applications:`)
    const indexes = await applicationsCollection.indexes()
    for (const index of indexes) {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`)
    }
    
    console.log("\n✅ Database opsætning fuldført!")
    console.log("Du kan nu køre din applikation med: npm run dev")
    
  } catch (error) {
    console.error("❌ Fejl under database opsætning:", error)
  } finally {
    await client.close()
  }
}

// Kør setup
setupDatabase()