const { MongoClient } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/yellowsingam_epaper";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('yellowsingam_epaper');
    const editions = await db.collection('editions').find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log("Recent Editions:");
    for (const e of editions) {
      console.log(`- ID: ${e._id}, Name: ${e.name}, Status: ${e.status}, Date stored: ${e.date} (Type: ${typeof e.date}), Date string representation:`, e.date);
    }
  } finally {
    await client.close();
  }
}

check().catch(console.error);
