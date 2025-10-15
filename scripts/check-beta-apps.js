// Script til at tjekke beta tester ansøgninger
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkBetaApps() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI mangler i .env.local');
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('Forbinder til MongoDB...');
    await client.connect();
    console.log('✅ Forbindelse til MongoDB lykkedes!');
    
    const db = client.db('divisionwebsite');
    
    // Tjek alle ansøgningstyper
    console.log('\n=== ANSØGNINGSTYPER I DATABASEN ===');
    const allTypes = await db.collection('applications').distinct('type');
    console.log('Fundne typer:', allTypes);
    
    // Tjek beta tester ansøgninger
    console.log('\n=== BETA TESTER ANSØGNINGER ===');
    const betaApps = await db.collection('applications').find({ type: 'Betatester' }).toArray();
    console.log(`Antal beta tester ansøgninger: ${betaApps.length}`);
    
    if (betaApps.length > 0) {
      betaApps.forEach((app, i) => {
        console.log(`\n${i + 1}. Beta ansøgning:`);
        console.log(`   ID: ${app._id || app.id}`);
        console.log(`   Discord: ${app.discordName} (${app.discordId})`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Oprettet: ${app.createdAt}`);
      });
    } else {
      console.log('Ingen beta tester ansøgninger fundet.');
    }
    
    // Tjek seneste ansøgninger generelt
    console.log('\n=== SENESTE 5 ANSØGNINGER ===');
    const recent = await db.collection('applications').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    recent.forEach((app, i) => {
      console.log(`${i + 1}. Type: ${app.type}, Discord: ${app.discordName}, Status: ${app.status}`);
    });
    
  } catch (error) {
    console.error('❌ Fejl:', error);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB forbindelse lukket');
  }
}

checkBetaApps().catch(console.error);