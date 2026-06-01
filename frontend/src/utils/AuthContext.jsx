/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  account,
  databases,
  storage,
  default as client,
  DATABASE_ID,
  PLAYERS_COLLECTION_ID,
  CLUBS_COLLECTION_ID,
  USERS_COLLECTION_ID,
  CHECKIN_COLLECTION_ID,
  BOOKINGS_COLLECTION_ID,
  MATCHES_COLLECTION_ID,
  SLIP_STORAGE_ID,
  MONEYSLIP_COLLECTION_ID
} from "../Appwrite";
import { toast } from 'react-hot-toast';
import { ID, Query } from "appwrite";
import { useLanguage } from "./LanguageProvider.jsx";

// Create context
const AuthContext = createContext();

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState(null);
  const clubsCacheRef = useRef(null);

  const navigate = useNavigate();

  // Check user session on app start
  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    setInitialLoading(true);
    try {
        const accountDetails = await account.get();
        setUser(accountDetails);
    } catch (error) {
        // If 401 unauthorized, user is not logged in - clear user
        if (error.code === 401) {
          setUser(null);
        } else {
          console.error("Unexpected error checking user session:", error);
        }
    } finally {
        setInitialLoading(false);
    }
  };

  const loginUser = async (userInfo) => {
    setLoading(true);
    try {
      await account.createEmailPasswordSession(
        userInfo.email,
        userInfo.password
      );
      const accountDetails = await account.get();
      setUser(accountDetails);
      localStorage.setItem("user", JSON.stringify(accountDetails));
      navigate("/");
    } catch (e) {
      toast.error(t("Please check the email or password."));
      console.error("Login error:", e);
    }
    setLoading(false);
  };

  const registerUser = async (userInfo) => {
    setLoading(true);
    try {
      await account.create(
        ID.unique(),
        userInfo.email,
        userInfo.password1,
        userInfo.name
      );
      // await databases.createDocument(
      //   DATABASE_ID,
      //   USERS_COLLECTION_ID,
      //   ID.unique(),
      //   {
      //     email: userInfo.email,
      //     name: userInfo.name,
      //   }
      // );
      await account.createEmailPasswordSession(
        userInfo.email,
        userInfo.password1
      );

      const accountDetails = await account.get();
      setUser(accountDetails);
      // localStorage.setItem("user", JSON.stringify(accountDetails));
      toast.success(t("SignUp successfully!"))
      navigate("/");
    } catch (e) {
      
      console.error("Register error:", e);
    }
    setLoading(false);
  };

  const logoutUser = async () => {
    await account.deleteSession("current");
    // localStorage.removeItem("user");
    setUser(null);
    navigate("/sign-in");
  };

  // Helper functions using user state
  const getUserName = useCallback(() => {
    return user?.name || "No name";
  }, [user]);

  const getAdminNameAcc = useCallback(() => {
    return user?.labels || ["No label"];
  }, [user]);

  const uploadPaymentQRToAppwrite = useCallback(async (file) => {
    if (!file) return null;
    try {
      const fileUpload = await storage.createFile(
        SLIP_STORAGE_ID,
        ID.unique(),
        file
      );
      return fileUpload.$id;
    } catch (e) {
      console.error("Error uploading QR file:", e);
      throw e;
    }
  }, []);

  const normalizePaymentAccountNumber = useCallback((value) => {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }, []);

  const resolveStorageUrl = useCallback((value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value.href === "string") return value.href;
    return String(value);
  }, []);

  const getPaymentQrUrls = useCallback((fileId) => {
    if (!fileId) {
      return {
        paymentQrFileId: null,
        paymentQrPreviewUrl: null,
        paymentQrDownloadUrl: null,
        paymentQrDisplayUrl: null,
      };
    }

    const normalizedFileId = String(fileId).trim();

    return {
      paymentQrFileId: normalizedFileId,
      paymentQrPreviewUrl: resolveStorageUrl(storage.getFilePreview(SLIP_STORAGE_ID, normalizedFileId)),
      paymentQrDownloadUrl: resolveStorageUrl(storage.getFileDownload(SLIP_STORAGE_ID, normalizedFileId)),
      paymentQrDisplayUrl: resolveStorageUrl(storage.getFileView(SLIP_STORAGE_ID, normalizedFileId)),
    };
  }, [resolveStorageUrl]);

  const mapClubDocument = useCallback((doc) => ({
    ...getPaymentQrUrls(doc.paymentQrFileId),
    id: doc.$id,
    clubName: doc.name,
    startPrice: doc.startPrice,
    pricePerGame: doc.pricePerGame,
    playingDay: doc.playingDay,
    startTime: doc.startTime,
    endTime: doc.endTime,
    paymentBank: doc.paymentBank || "",
    paymentAccountName: doc.paymentAccountName || "",
    paymentAccountNumber: doc.paymentAccountNumber || "",
  }), [getPaymentQrUrls]);

  const getAvailablePaymentQrFiles = useCallback(async () => {
    try {
      const response = await storage.listFiles(SLIP_STORAGE_ID);

      return response.files.map((file) => ({
        id: file.$id,
        name: file.name,
        createdAt: file.$createdAt,
        ...getPaymentQrUrls(file.$id),
      }));
    } catch (e) {
      console.error("Failed to fetch payment QR files:", e);
      toast.error(t("Failed to load payment QR files."));
      return [];
    }
  }, [getPaymentQrUrls, t]);

  const createClubs = async (userInfo) => {
    setLoading(true);
    try {
      let paymentQrFileId = userInfo.paymentQrFileId || null;
      const paymentAccountNumber = normalizePaymentAccountNumber(userInfo.paymentAccountNumber);
      if (userInfo.paymentQrFile) {
        paymentQrFileId = await uploadPaymentQRToAppwrite(userInfo.paymentQrFile);
      }

      await databases.createDocument(
        DATABASE_ID,
        CLUBS_COLLECTION_ID,
        ID.unique(),
        {
          name: userInfo.clubName,
          startPrice: userInfo.startPrice,
          playingDay: userInfo.daysPlaying,
          startTime: userInfo.startTime,
          endTime: userInfo.endTime,
          pricePerGame: userInfo.pricePerGame,
          paymentBank: userInfo.paymentBank || "",
          paymentAccountName: userInfo.paymentAccountName || "",
          paymentAccountNumber,
          paymentQrFileId: paymentQrFileId || null,
        }
      );
      clubsCacheRef.current = null;
      toast.success(t("Create Club Successfully!"));
    } catch (e) {
        console.error("Error creating club:", e);
        toast.error(t("Failed to create club. Please try again."));
    } finally {
        setLoading(false);
    }
  }

  const getClubData = useCallback(async () => {
    if (clubsCacheRef.current) {
      return clubsCacheRef.current;
    }

    setLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, CLUBS_COLLECTION_ID);
      const clubs = response.documents.map(mapClubDocument);
      clubsCacheRef.current = clubs;
      return clubs;
    } catch (e) {
      console.error("Failed to fetch clubs:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [mapClubDocument]);

  const getClubById = useCallback(async (clubId) => {
    try {
      if (clubsCacheRef.current) {
        const cachedClub = clubsCacheRef.current.find((club) => club.id === clubId);
        if (cachedClub) {
          return cachedClub;
        }
      }

      const doc = await databases.getDocument(
        DATABASE_ID,
        CLUBS_COLLECTION_ID,
        clubId
      );

      const mappedClub = mapClubDocument(doc);

      if (clubsCacheRef.current) {
        const nextClubs = clubsCacheRef.current.filter((club) => club.id !== clubId);
        clubsCacheRef.current = [...nextClubs, mappedClub];
      }

      return mappedClub;
    } catch (e) {
      console.error("Failed to fetch club by id:", e);
      return null;
    }
  }, [mapClubDocument]);

  const updateClub = async (clubId, updatedData) => {
    setLoading(true);
    try {
      const paymentAccountNumber = normalizePaymentAccountNumber(updatedData.paymentAccountNumber);
      const payload = {
        name: updatedData.clubName,
        startPrice: updatedData.startPrice,
        playingDay: updatedData.daysPlaying,
        startTime: updatedData.startTime,
        endTime: updatedData.endTime,
        pricePerGame: updatedData.pricePerGame,
        paymentBank: updatedData.paymentBank || "",
        paymentAccountName: updatedData.paymentAccountName || "",
        paymentAccountNumber,
      };

      if (updatedData.paymentQrFile) {
        payload.paymentQrFileId = await uploadPaymentQRToAppwrite(updatedData.paymentQrFile);
      } else if (updatedData.paymentQrFileId !== undefined) {
        payload.paymentQrFileId = updatedData.paymentQrFileId || null;
      }

      await databases.updateDocument(
        DATABASE_ID,
        CLUBS_COLLECTION_ID,
        clubId, // using Appwrite's document ID
        payload
      );
      clubsCacheRef.current = null;
      toast.success(t("Club updated successfully!"));
      return await getClubById(clubId);
    } catch (e) {
      console.error("Error updating club:", e);
      toast.error(e?.message || "Failed to update club. Please try again.");
      throw e;
    } finally {
      setLoading(false);
    }
  };
  const deleteClub = async (clubId) => {
    setLoading(true);
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        CLUBS_COLLECTION_ID,
        clubId
      );
      clubsCacheRef.current = null;
      toast.success(t("Club deleted successfully!"));
    } catch (e) {
      console.error("Error deleting club:", e);
      toast.error(t("Failed to delete club. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (playerData) => {
    setLoading(true);
    try {
      const res = await databases.createDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        ID.unique(),
        {
          name: playerData.name,
          skillLevel: playerData.skillLevel,
          club: playerData.clubs,
        }
      );
      toast.success(t("Player added successfully!"));
      return res;
    } catch (e) {
      console.error("Error adding player:", e);
      toast.error(t("Failed to add player. Please try again."));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await databases.listDocuments(DATABASE_ID, PLAYERS_COLLECTION_ID);
      return response.documents.map(doc => ({
        id: doc.$id,
        name: doc.name,
        skillLevel: doc.skillLevel,
        club: doc.club || [], // safely fallback to empty array
        gamesPlayed: doc.gamesPlayed || 0,
      }));
      
    } catch (e) {
      console.error("Failed to get players:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updatedPlayers = async (playerId, updatedData) => {
    setLoading(true);
    try {
      await databases.updateDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        playerId, // using Appwrite's document ID
        updatedData
      );
    } catch (e) {
      console.error("Failed to Update Players:", e)
    }
  }

  const incrementGamePlayed = async (playerId) => {
    setLoading(true);
    try {
      const playerDoc = await databases.getDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        playerId, // using Appwrite's document ID
      )

      const currentGamePlayed = playerDoc.gamesPlayed || 0;

      await updatedPlayers(playerId, {gamesPlayed: currentGamePlayed + 1});
    } catch (e) {
      console.log("Failed to increment game:", e)
    } finally {
      setLoading(false);
    }
  }

  const deletePlayer = async (playerId, onSuccess) => {
    setLoading(true);
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        playerId
      );
      toast.success(t("Player deleted successfully!"));
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Error deleting player:", e);
      toast.error(t("Failed to delete player. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const getBangkokToday = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  // Booking Feature
  const createBooking = async ({ playerName, clubId, bookingTime }) => {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        ID.unique(),
        {
          playerName,
          clubId,
          bookingTime,
          bookingDate: getBangkokToday(),
          status: "booked",
        }
      );

      toast.success(t("Booking successful!"));
      return response;
    } catch (error) {
      console.error("Failed to create booking:", error);
      throw error;
    }
  };

  const getTodayBookings = async (clubId) => {
    try {
      if (!clubId) {
        throw new Error('clubId is required to fetch bookings');
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        [
          Query.equal('clubId', clubId),
          Query.equal("bookingDate", getBangkokToday()),
        ]
      )

      return response.documents.sort((a,b) => 
        a.bookingTime.localeCompare(b.bookingTime)
      );
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      return [];
    }
  }

  // Check-in Feature
  const getCheckIn = async (club) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        CHECKIN_COLLECTION_ID,
        [
          Query.equal("clubId", club.id),
          Query.equal("checkInDate", getBangkokToday()),
        ]
      );
      // Sort earliest to latest by checkInTime (e.g., 20:00 → 20:30 → 21:00)
      const sorted = response.documents.sort((a, b) =>
        a.checkInTime.localeCompare(b.checkInTime)
      );

      return sorted;
    } catch (e) {
      console.error("Failed to fetch check-ins:", e);
      return [];
    }
  }

  const completePendingCheckIn = async ({ checkIn, revisedName, skillLevel }) => {
    const cleanName = String(revisedName || "").trim();

    if (!checkIn?.$id) throw new Error("checkIn is required");
    if (!checkIn.lineUserId) throw new Error("Check-in is missing lineUserId");
    if (!cleanName) throw new Error("Revised name is required");
    if (!skillLevel) throw new Error("Skill level is required");

    try {
      const player = await databases.createDocument(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID,
        ID.unique(),
        {
          name: cleanName,
          skillLevel,
          club: [checkIn.clubId],
          lineUserId: checkIn.lineUserId,
          lineDisplayName: checkIn.lineDisplayName || checkIn.name,
        }
      );

      const updatedCheckIn = await databases.updateDocument(
        DATABASE_ID,
        CHECKIN_COLLECTION_ID,
        checkIn.$id,
        {
          name: cleanName,
          revisedName: cleanName,
          skillLevel,
          playerId: player.$id,
          status: "ready_for_matchmaking",
        }
      );

      toast.success(t("New player profile completed!"));

      return {
        player,
        checkIn: updatedCheckIn,
      };
    } catch (error) {
      console.error("Failed to complete pending check-in:", error);
      toast.error(error?.message || "Failed to complete player profile.");
      throw error;
    }
  };

  const createMatch = async ({players, court}) => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        ID.unique(),
        {
          players,
          court,
          startTime: new Date().toISOString(),
        }
      )
      toast.success(t("Match End"));
    } catch (e) {
      console.error("Failed to create match:", e);
      throw e;
    }
  }

  const getMatchesByClubId = useCallback(async (clubId = null) => {
    try {
      const queries = [
        Query.orderDesc('startTime'), // newest first
      ];

      if (clubId) {
        queries.unshift(Query.equal('clubId', clubId));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        queries
      );

      // response.documents will be an array of your match documents
      return response.documents.map(doc => ({
        id: doc.$id,
        players: doc.players || [],
        court: doc.court,
        startTime: doc.startTime,
        clubId: doc.clubId,
        status: doc.status || '',
        totalTime: doc.totalTime,
        matchScore: doc.matchScore || '',
        winningTeam: doc.winningTeam || '',
      }))
    } catch (e) {
      console.error("Failed to fetch matches:", e);
      throw e;
    }
  }, []);

  const getMatches = useCallback(async () => {
    return await getMatchesByClubId();
  }, [getMatchesByClubId]);

  const getDashboardMatchesByClubId = useCallback(async (clubId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.equal('clubId', clubId),
          Query.orderAsc('startTime'),
        ]
      );

      return response.documents.map((doc) => ({
        id: doc.$id,
        players: doc.players || [],
        court: doc.court,
        startTime: doc.startTime,
        clubId: doc.clubId,
        status: doc.status || 'WAITING',
        totalTime: doc.totalTime,
        matchScore: doc.matchScore || '',
        winningTeam: doc.winningTeam || '',
        updatedAt: doc.$updatedAt,
      }));
    } catch (e) {
      console.error('Failed to fetch dashboard matches:', e);
      return [];
    }
  }, []);

  const subscribeToDashboardMatches = useCallback((clubId, onEvent) => {
    if (!clubId || typeof onEvent !== 'function') {
      return () => {};
    }

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${MATCHES_COLLECTION_ID}.documents`,
      ({ events, payload }) => {
        if (payload.clubId !== clubId) return;

        const match = {
          id: payload.$id,
          players: payload.players || [],
          court: payload.court,
          startTime: payload.startTime,
          clubId: payload.clubId,
          status: payload.status || 'WAITING',
          totalTime: payload.totalTime,
          matchScore: payload.matchScore || '',
          winningTeam: payload.winningTeam || '',
          updatedAt: payload.$updatedAt,
        };

        onEvent({ events, match, payload });
      }
    );

    let isUnsubscribed = false;

    return () => {
      if (isUnsubscribed) return;
      isUnsubscribed = true;

      try {
        unsubscribe();
      } catch (e) {
        if (!String(e?.message || '').includes('CLOSING or CLOSED')) {
          console.error('Failed to unsubscribe from dashboard matches:', e);
        }
      }
    };
  }, []);

  const queueDashboardMatch = async ({ players, court, clubId }) => {
    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        ID.unique(),
        {
          players,
          court,
          clubId,
          startTime: new Date().toISOString(),
          status: 'WAITING',
        }
      );
      return doc;
    } catch (e) {
      console.error('Failed to queue match:', e);
      throw e;
    }
  };

  const startDashboardMatch = async (dashboardMatchId, fallbackData = null) => {
    const startById = async (id) => {
      await databases.updateDocument(DATABASE_ID, MATCHES_COLLECTION_ID, id, {
        status: 'PLAYING',
      });
      return id;
    };

    try {
      if (dashboardMatchId) {
        return await startById(dashboardMatchId);
      }

      if (!fallbackData) {
        throw new Error('No dashboard match id or fallback data provided.');
      }
    } catch (e) {
      if (e?.code !== 404 || !fallbackData) {
        console.error('Failed to start match:', e);
        throw e;
      }
    }

    try {
      const playersKey = (fallbackData.players || []).join('|').toLowerCase();
      const response = await databases.listDocuments(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.equal('clubId', fallbackData.clubId),
          Query.equal('court', fallbackData.court),
          Query.equal('status', 'WAITING'),
          Query.orderDesc('$createdAt'),
          Query.limit(25),
        ]
      );

      const existingDoc = response.documents.find((doc) => (
        (doc.players || []).join('|').toLowerCase() === playersKey
      ));

      if (existingDoc) {
        return await startById(existingDoc.$id);
      }

      const created = await databases.createDocument(
        DATABASE_ID,
        MATCHES_COLLECTION_ID,
        ID.unique(),
        {
          players: fallbackData.players || [],
          court: fallbackData.court,
          clubId: fallbackData.clubId,
          startTime: fallbackData.startTime || new Date().toISOString(),
          status: 'PLAYING',
        }
      );

      return created.$id;
    } catch (e) {
      console.error('Failed to start match:', e);
      throw e;
    }
  };

  const findDashboardMatchByFallback = async (fallbackData, statuses = []) => {
    if (!fallbackData?.clubId || !fallbackData?.court) {
      return null;
    }

    const playersKey = (fallbackData.players || []).join('|').toLowerCase();
    const queries = [
      Query.equal('clubId', fallbackData.clubId),
      Query.equal('court', fallbackData.court),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ];

    if (statuses.length > 0) {
      queries.splice(2, 0, Query.equal('status', statuses));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      MATCHES_COLLECTION_ID,
      queries
    );

    return response.documents.find((doc) => (
      (doc.players || []).join('|').toLowerCase() === playersKey
    )) || null;
  };

  const endDashboardMatch = async (dashboardMatchId, { totalTime, fallbackData }) => {
    try {
      if (dashboardMatchId) {
        await databases.updateDocument(DATABASE_ID, MATCHES_COLLECTION_ID, dashboardMatchId, {
          status: 'FINISHED',
          ...(totalTime !== null && totalTime !== undefined && { totalTime }),
        });
      } else {
        await databases.createDocument(DATABASE_ID, MATCHES_COLLECTION_ID, ID.unique(), {
          ...fallbackData,
          status: 'FINISHED',
          ...(totalTime !== null && totalTime !== undefined && { totalTime }),
        });
      }
    } catch (e) {
      if (e?.code === 404 && fallbackData) {
        try {
          const existingDoc = await findDashboardMatchByFallback(fallbackData, ['WAITING', 'PLAYING']);

          if (existingDoc) {
            await databases.updateDocument(DATABASE_ID, MATCHES_COLLECTION_ID, existingDoc.$id, {
              status: 'FINISHED',
              ...(totalTime !== null && totalTime !== undefined && { totalTime }),
            });
            return;
          }

          await databases.createDocument(DATABASE_ID, MATCHES_COLLECTION_ID, ID.unique(), {
            ...fallbackData,
            status: 'FINISHED',
            ...(totalTime !== null && totalTime !== undefined && { totalTime }),
          });
          return;
        } catch (recoveryError) {
          console.error('Failed to recover end match after missing document:', recoveryError);
          throw recoveryError;
        }
      }

      console.error('Failed to end match:', e);
      throw e;
    }
  };

  const clearMatchesAndResetPlayers = async () => {
    try {
      // 1. Fetch all match documents
      const matches = await databases.listDocuments(
        DATABASE_ID,
        MATCHES_COLLECTION_ID
      );

      // 2. Fetch all users
      const players = await databases.listDocuments(
        DATABASE_ID,
        PLAYERS_COLLECTION_ID
      );

      // 3. Delete all match documents in parallel
      await Promise.all(
        matches.documents.map((match) =>
          databases.deleteDocument(DATABASE_ID, MATCHES_COLLECTION_ID, match.$id)
        )
      );

      // 4. Reset gamesPlayed to 0 for all PLAYERS in parallel
      await Promise.all(
        players.documents.map((player) =>
          databases.updateDocument(DATABASE_ID, PLAYERS_COLLECTION_ID, player.$id, {
            gamesPlayed: 0,
          })
        )
      );

      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      return false;
    }
  };

  const uploadSlipToAppwrite = async ({ file, clubId, userName }) => {
    console.log(file, clubId, userName);
    if (!file || !clubId || !userName) {
      throw new Error("Missing required data");
    }

    // Step 1: Check for existing slip for this user + club
    const existing = await databases.listDocuments(
      DATABASE_ID,
      MONEYSLIP_COLLECTION_ID,
      [
        Query.equal("user", userName),
        Query.equal("club", clubId)
      ]
    );

    if (existing.documents.length > 0) {
      const oldDoc = existing.documents[0];

      // Delete the old file from storage
      try {
        await storage.deleteFile(SLIP_STORAGE_ID, oldDoc.fileId);
      } catch (e) {
        console.warn("Failed to delete old file, continuing:", e);
      }

      // Delete the old metadata document
      try {
        await databases.deleteDocument(DATABASE_ID, MONEYSLIP_COLLECTION_ID, oldDoc.$id);
      } catch (e) {
        console.warn("Failed to delete old document, continuing:", e);
      }
    }

    // Step 2: Upload new file
    const fileUpload = await storage.createFile(
      SLIP_STORAGE_ID,
      ID.unique(),
      file
    );

    // Step 3: Save metadata
    const doc = await databases.createDocument(
      DATABASE_ID,
      MONEYSLIP_COLLECTION_ID,
      ID.unique(),
      {
        user: userName,
        club: clubId,
        fileId: fileUpload.$id,
        timestamp: new Date().toISOString(),
      }
    );

    return { file: fileUpload, document: doc };
  };


  const getUserFileId = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MONEYSLIP_COLLECTION_ID,
      )
      return response.documents.map(doc => ({
        user: doc.user,
        fileId: doc.fileId,
        timestamp: doc.timestamp,
        club: doc.club
      }))
    } catch (e) {
      console.error("Error fetching user file data:", e);
      return [];
    }
  }, []);

  const getUploadedSlipsByUser = async (userId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MONEYSLIP_COLLECTION_ID,
        [Query.equal("userId", userId)]
      );

      // Attach preview URL to each slip
      const slipsWithPreview = response.documents.map((doc) => ({
        ...doc,
        previewUrl: storage.getFilePreview(
          SLIP_STORAGE_ID,
          doc.fileId
        ).href,
      }));

      return slipsWithPreview;
    } catch (err) {
      console.error("Error fetching user slips:", err);
      throw err;
    }
  }

  const getPreviewUrlsFromFileIds = useCallback((fileIds) => {
    return fileIds.map(fileId => ({
      getUserFileId,
      fileId,
      previewUrl: storage.getFileDownload(SLIP_STORAGE_ID, fileId),
    }));
  }, [getUserFileId]);

  const getPreviewUrlsFromDocs = useCallback((docs) => {
    return docs.map(doc => ({
      user: doc.user,
      timestamp: doc.timestamp,
      club: doc.club,
      fileId: doc.fileId,
      previewUrl: storage.getFileDownload(SLIP_STORAGE_ID, doc.fileId)
    }));
  }, []);

  const updateUserName = async (newName) => {
    if (!newName) throw new Error("Name is required");

    try {
      const updatedUser = await account.updateName(newName);
      toast.success(t("Name updated"), updatedUser);
      console.log("Name updated:", updatedUser);
      return updatedUser;
    } catch (error) {
      toast.error(t("Failed to update name"))
      console.error("Failed to update name:", error);
      throw error;
    }
  };

  const fetchUser = useCallback(async () => {
    const userData = await account.get();  // or your API call to get current user info
    setUser(userData);
  }, []);

  
  // Context value
  const contextData = {
    user,
    loginUser,
    logoutUser,
    registerUser,
    loading,
    getUserName,
    getAdminNameAcc,
    createClubs,
    getClubData,
    getClubById,
    updateClub,
    deleteClub,
    addPlayer,
    getPlayers,
    updatedPlayers,
    deletePlayer,
    createBooking,
    getTodayBookings,
    completePendingCheckIn,
    createMatch,
    getMatches,
    getMatchesByClubId,
    getDashboardMatchesByClubId,
    subscribeToDashboardMatches,
    queueDashboardMatch,
    startDashboardMatch,
    endDashboardMatch,
    incrementGamePlayed,
    getCheckIn,
    clearMatchesAndResetPlayers,
    uploadSlipToAppwrite,
    getUploadedSlipsByUser,
    getUserFileId,
    getPreviewUrlsFromFileIds,
    getPreviewUrlsFromDocs,
    updateUserName,
    fetchUser,
    uploadPaymentQRToAppwrite,
    getAvailablePaymentQrFiles
  };

  return (
    <AuthContext.Provider value={contextData}>
      {initialLoading ? (
        <div className="flex justify-center items-center bg-blue-50 w-screen h-screen">
          <p className="font-semibold text-blue-700 text-lg">{t('Loading...')}</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// useAuth hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
