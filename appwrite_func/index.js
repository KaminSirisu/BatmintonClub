const { Client, Databases, Query } = require("node-appwrite");

// Environment variables set in Appwrite Function Settings
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const API_KEY = process.env.VITE_APPWRITE_API_KEY;

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const CHECKIN_COLLECTION_ID = process.env.VITE_APPWRITE_CHECKIN_COLLECTION_ID;

// Set up Appwrite client
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY); // You must provide a secret API key

const databases = new Databases(client);

// Delete check-ins older than 1 day
const deleteOldCheckIns = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const docs = await databases.listDocuments(
      DATABASE_ID,
      CHECKIN_COLLECTION_ID,
      [Query.lessThan("createAt", oneDayAgo)] // or "createdAt" if you use system field
    );

    if (docs.documents.length === 0) {
      console.log("No old check-ins to delete.");
      return;
    }

    await Promise.all(
      docs.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, CHECKIN_COLLECTION_ID, doc.$id)
          .then(() => console.log(`✅ Deleted check-in: ${doc.$id}`))
          .catch(err => console.error(`❌ Failed to delete ${doc.$id}:`, err.message))
      )
    );

    console.log(`✅ Deleted ${docs.documents.length} old check-ins.`);
  } catch (err) {
    console.error("❌ Error deleting check-ins:", err.message);
  }
};

// Run function (Appwrite will invoke this script directly)
deleteOldCheckIns()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
