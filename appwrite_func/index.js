import { Client, Databases, Query } from "node-appwrite";
import cron from "node-cron";
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

const client = new Client()
  .setEndpoint(ENDPOINT) // Your Appwrite endpoint
  .setProject(PROJECT_ID) // Your project ID


const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CHECKIN_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CHECKIN_COLLECTION_ID;

const deleteOldCheckIns = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const docs = await databases.listDocuments(
      DATABASE_ID,
      CHECKIN_COLLECTION_ID,
      [Query.lessThan("createAt", oneDayAgo)]  // Note the field name "createdAt"
    );

    if (docs.documents.length === 0) {
      console.log("No old check-ins to delete.");
      return;
    }

    await Promise.all(
      docs.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, CHECKIN_COLLECTION_ID, doc.$id)
          .then(() => console.log(`Deleted check-in: ${doc.$id}`))
          .catch(err => console.error(`Failed to delete ${doc.$id}:`, err.message))
      )
    );

    console.log(`✅ Deleted ${docs.documents.length} old check-ins.`);
  } catch (err) {
    console.error("❌ Error deleting check-ins:", err.message);
  }
};

// Schedule to run every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled check-in cleanup...");
  deleteOldCheckIns();
});

// Run the deletion immediately when script runs
deleteOldCheckIns();
