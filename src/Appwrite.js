// AppwriteService.js
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const PLAYERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PLAYERS_COLLECTION_ID;
export const CLUBS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CLUBS_COLLECTION_ID;
export const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;
export const CHECKIN_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CHECKIN_COLLECTION_ID;
export const MATCHES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MATCHES_COLLECTION_ID;
export const SLIP_STORAGE_ID = import.meta.env.VITE_APPWRITE_SLIP_STORAGE_ID;
export const MONEYSLIP_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MONEYSLIP_COLLECTION_ID;
export const BOOKINGS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BOOKINGS_COLLECTION_ID;

import { Client, Account, Databases, Storage} from 'appwrite';

const client = new Client()
  .setEndpoint(ENDPOINT) // replace with your endpoint
  .setProject(PROJECT_ID);

const clearRealtimeHeartbeat = () => {
  if (client.realtime?.heartbeat) {
    clearInterval(client.realtime.heartbeat);
    client.realtime.heartbeat = undefined;
  }
};

if (client.realtime) {
  client.realtime.createHeartbeat = () => {
    clearRealtimeHeartbeat();

    client.realtime.heartbeat = window?.setInterval(() => {
      const socket = client.realtime?.socket;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        clearRealtimeHeartbeat();
        return;
      }

      socket.send(JSON.stringify({ type: 'ping' }));
    }, 20000);
  };
}

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);

export default client;
