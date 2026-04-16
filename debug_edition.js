const { MongoClient } = require('mongodb');

async function check() {
  const uri = "mongodb+srv://cbnyellowsingam_web:ashokca810%40A@yellowsingamweb.ujbdill.mongodb.net/yellowsingam_epaper?retryWrites=true&w=majority&appName=Yellowsingamweb";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('yellowsingam_epaper');
    
    // Find April 10th edition
    const edition = await db.collection('editions').findOne({ 
      name: /April 10/i 
    });

    if (edition) {
      console.log("Edition found:", edition.name);
      console.log("Date stored:", edition.date, "(Type:", typeof edition.date, ")");
      console.log("Status:", edition.status);
      console.log("Number of pages:", edition.pages ? edition.pages.length : 0);
      
      if (edition.pages && edition.pages.length > 0) {
        console.log("First Page URL:", edition.pages[0].url);
        console.log("First Page PreviewURL:", edition.pages[0].previewUrl);
        
        // Check if any pages have broken-looking URLs or missing fields
        const missingPreview = edition.pages.filter(p => !p.previewUrl).length;
        console.log(`Pages missing previewUrl: ${missingPreview}`);
      }
    } else {
      console.log("April 10 edition not found");
    }
  } finally {
    await client.close();
  }
}

check().catch(console.error);
