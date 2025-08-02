const sdk = require("node-appwrite");

module.exports = async function (req, res) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const docs = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_CHECKIN_COLLECTION_ID,
      [sdk.Query.lessThan("createAt", oneDayAgo)]
    );

    for (const doc of docs.documents) {
      await databases.deleteDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_CHECKIN_COLLECTION_ID,
        doc.$id
      );
    }

    res.json({
      success: true,
      deleted: docs.documents.length,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
};
