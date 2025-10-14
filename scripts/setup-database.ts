// TypeScript version af database setup
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = "divisionhjemmeside"

interface Application {
  id: string
  type: string
  discordId: string
  discordName: string
  discordAvatar: string
  fields: Record<string, string>
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

async function setupDatabase() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI ikke fundet i environment variabler!")
    console.log("Tilføj din MongoDB connection string til .env.local filen:")
    console.log("MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/divisionhjemmeside")
    process.exit(1)
  }

  console.log("🚀 Starter database opsætning...")
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log("✅ Forbundet til MongoDB Atlas")
    
    const db = client.db(DATABASE_NAME)
    
    // Opret applications collection med schema validation
    try {
      await db.createCollection("applications", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["id", "type", "discordId", "discordName", "fields", "status", "createdAt"],
            properties: {
              id: { bsonType: "string" },
              type: { bsonType: "string", enum: ["staff", "whitelist", "content-creator", "banda"] },
              discordId: { bsonType: "string" },
              discordName: { bsonType: "string" },
              discordAvatar: { bsonType: "string" },
              fields: { bsonType: "object" },
              status: { bsonType: "string", enum: ["pending", "approved", "rejected"] },
              createdAt: { bsonType: "string" }
            }
          }
        }
      })
      console.log("✅ Oprettet applications collection med schema validation")
    } catch (error: any) {
      if (error.code === 48) {
        console.log("ℹ️  Applications collection eksisterer allerede")
      } else {
        throw error
      }
    }
    
    const applicationsCollection = db.collection<Application>("applications")
    
    // Opret indekser
    try {
      await applicationsCollection.createIndex({ id: 1 }, { unique: true, name: "id_unique" })
      console.log("✅ Oprettet indeks: id_unique")
    } catch (error: any) {
      if (error.code === 85) console.log("ℹ️  Indeks id_unique eksisterer allerede")
    }
    
    try {
      await applicationsCollection.createIndex({ discordId: 1 }, { name: "discordId_index" })
      console.log("✅ Oprettet indeks: discordId_index")
    } catch (error: any) {
      if (error.code === 85) console.log("ℹ️  Indeks discordId_index eksisterer allerede")
    }
    
    try {
      await applicationsCollection.createIndex({ type: 1 }, { name: "type_index" })
      console.log("✅ Oprettet indeks: type_index")
    } catch (error: any) {
      if (error.code === 85) console.log("ℹ️  Indeks type_index eksisterer allerede")
    }
    
    try {
      await applicationsCollection.createIndex({ status: 1 }, { name: "status_index" })
      console.log("✅ Oprettet indeks: status_index")
    } catch (error: any) {
      if (error.code === 85) console.log("ℹ️  Indeks status_index eksisterer allerede")
    }
    
    try {
      await applicationsCollection.createIndex({ createdAt: 1 }, { name: "createdAt_index" })
      console.log("✅ Oprettet indeks: createdAt_index")
    } catch (error: any) {
      if (error.code === 85) console.log("ℹ️  Indeks createdAt_index eksisterer allerede")
    }
    
    // Database statistik
    const stats = await db.stats()
    const appCount = await applicationsCollection.countDocuments()
    
    console.log("\n📊 Database Statistik:")
    console.log(`Database: ${DATABASE_NAME}`)
    console.log(`Størrelse: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Ansøgningar: ${appCount} dokumenter`)
    
    // Vis status fordeling
    console.log("\n📈 Ansøgnings Status:")
    const statusStats = await applicationsCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray()
    
    statusStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`)
    })
    
    console.log("\n✅ Database opsætning komplet!")
    console.log("🎉 Du kan nu køre din applikation!")
    
  } catch (error) {
    console.error("❌ Database setup fejl:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupDatabase().catch(console.error)