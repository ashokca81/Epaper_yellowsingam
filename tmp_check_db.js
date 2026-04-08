const { MongoClient } = require('mongodb');

async function check() {
  const uri = "mongodb+srv://cbnyellowsingam_web:ashokca810%40A@yellowsingamweb.ujbdill.mongodb.net/yellowsingam_epaper?retryWrites=true&w=majority&appName=Yellowsingamweb";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('yellowsingam_epaper');
    const query = {
      $or: [
        { status: 'published' },
        { status: 'scheduled', date: { $lte: new Date() } }
      ]
    };
    console.log("Testing with query:", JSON.stringify(query));
    
    const matchedEditions = await db.collection('editions').find(query).sort({ date: -1 }).limit(3).toArray();
    console.log("Matched Editions:");
    for (const e of matchedEditions) {
      console.log(`- ID: ${e._id}, Name: ${e.name}, Status: ${e.status}, Date: ${e.date.toISOString()}`);
    }
  } finally {
    await client.close();
  }
}

check().catch(console.error);
