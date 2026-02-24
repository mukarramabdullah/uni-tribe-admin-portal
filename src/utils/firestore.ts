import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
  Timestamp,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Base64Data } from "./base64Utils";

/**
 * Get a single document by ID
 */
export const getDocument = async (
  collectionName: string,
  documentId: string,
): Promise<DocumentData | null> => {
  if (!db) {
    console.warn("Firestore is not initialized. Returning null.");
    return null;
  }

  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
};

/**
 * Get all documents from a collection
 */
export const getDocuments = async (
  collectionName: string,
  constraints?: QueryConstraint[],
): Promise<DocumentData[]> => {
  if (!db) {
    console.warn("Firestore is not initialized. Returning empty array.");
    return [];
  }

  const collectionRef = collection(db, collectionName);
  const q = constraints ? query(collectionRef, ...constraints) : collectionRef;
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Add a new document to a collection
 */
export const addDocument = async (
  collectionName: string,
  data: DocumentData,
): Promise<string> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Update an existing document
 */
export const updateDocument = async (
  collectionName: string,
  documentId: string,
  data: Partial<DocumentData>,
): Promise<void> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a document
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string,
): Promise<void> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const docRef = doc(db, collectionName, documentId);
  await deleteDoc(docRef);
};

/**
 * Batch write operations
 */
export const batchWrite = async (
  operations: Array<{
    type: "add" | "update" | "delete";
    collectionName: string;
    documentId?: string;
    data?: DocumentData;
  }>,
): Promise<void> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const batch = writeBatch(db);
  const firestore = db;

  operations.forEach((op) => {
    if (op.type === "delete" && op.documentId) {
      const docRef = doc(firestore, op.collectionName, op.documentId);
      batch.delete(docRef);
    } else if (op.type === "update" && op.documentId && op.data) {
      const docRef = doc(firestore, op.collectionName, op.documentId);
      batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
    }
  });

  await batch.commit();
};

/**
 * Subscribe to real-time updates for a document
 */
export const subscribeToDocument = (
  collectionName: string,
  documentId: string,
  callback: (data: DocumentData | null) => void,
): Unsubscribe => {
  if (!db) {
    console.warn(
      "Firestore is not initialized. Returning no-op unsubscribe function.",
    );
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }

  const docRef = doc(db, collectionName, documentId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

/**
 * Subscribe to real-time updates for a collection
 */
export const subscribeToCollection = (
  collectionName: string,
  callback: (data: DocumentData[]) => void,
  constraints?: QueryConstraint[],
): Unsubscribe => {
  if (!db) {
    console.warn(
      "Firestore is not initialized. Returning no-op unsubscribe function.",
    );
    // Return a no-op function that can be called safely
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  const collectionRef = collection(db, collectionName);
  const q = constraints ? query(collectionRef, ...constraints) : collectionRef;

  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(documents);
  });
};

/**
 * Query helper functions
 */
export const queryHelpers = {
  where: (field: string, operator: any, value: any) =>
    where(field, operator, value),
  orderBy: (field: string, direction: "asc" | "desc" = "asc") =>
    orderBy(field, direction),
  limit: (count: number) => limit(count),
};

/**
 * Convert Firestore Timestamp to Date
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

/**
 * Get server timestamp
 */
export const getServerTimestamp = () => serverTimestamp();

/**
 * Add document with Base64 file data
 * Optimized for storing files directly in Firestore
 */
export const addDocumentWithBase64 = async (
  collectionName: string,
  data: DocumentData,
  base64Files?: { [key: string]: Base64Data },
): Promise<string> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const documentData = {
    ...data,
    ...(base64Files && { files: base64Files }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, collectionName), documentData);
  return docRef.id;
};

/**
 * Update document with Base64 file data
 */
export const updateDocumentWithBase64 = async (
  collectionName: string,
  documentId: string,
  data: Partial<DocumentData>,
  base64Files?: { [key: string]: Base64Data },
): Promise<void> => {
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const docRef = doc(db, collectionName, documentId);
  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (base64Files) {
    updateData.files = base64Files;
  }

  await updateDoc(docRef, updateData);
};

/**
 * Get document and extract Base64 files
 */
export const getDocumentWithBase64 = async (
  collectionName: string,
  documentId: string,
): Promise<{
  document: DocumentData | null;
  files?: { [key: string]: Base64Data };
}> => {
  const document = await getDocument(collectionName, documentId);

  if (!document) {
    return { document: null };
  }

  const { files, ...rest } = document;
  return {
    document: rest,
    files: files as { [key: string]: Base64Data } | undefined,
  };
};

/**
 * Collection-specific helpers for storing Base64 files
 */

// Academic Resources
export const addAcademicResource = async (data: {
  title: string;
  semester: string;
  subject: string;
  resourceType: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileBase64: string;
  department?: string;
}): Promise<string> => {
  return await addDocument("academic_resources", {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Lost and Found Items
export const addLostAndFoundItem = async (data: {
  title: string;
  reportType: string;
  description: string;
  date: string;
  time: string;
  imageUrl: string;
  isClaimed: boolean;
  createdBy: string;
  claimedBy?: string;
  claimedAt?: string;
  department?: string;
}): Promise<string> => {
  return await addDocument("lostNfound", {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// Events
export const addEvent = async (data: {
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  department?: string;
}): Promise<string> => {
  return await addDocument("events", {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// Groups
export const addGroup = async (data: {
  name: string;
  description: string;
  coverImage: string;
  category: string;
  icon: any; // IconData
  iconColor: string; // Color
  membersCount: number;
  department?: string;
}): Promise<string> => {
  return await addDocument("groups", {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// Users
export const addUserWithProfilePicture = async (data: {
  uid: string;
  name: string;
  email: string;
  degree: string;
  semester: string;
  gender: string;
  profileImageBase64: string;
  fcmToken: string;
  isProfileCompleted: boolean;
  department?: string;
}): Promise<string> => {
  return await addDocument("users", {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const updateUserProfilePicture = async (
  userId: string,
  profileImageBase64: string,
): Promise<void> => {
  return await updateDocument("users", userId, {
    profileImageBase64,
  });
};

/**
 * ============================================
 * AUDIT LOGS - Firebase-based Activity Logging
 * ============================================
 */

export interface AuditLogEntry {
  adminId: string;
  adminEmail: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "VIEW"
    | "EXPORT";
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  screenshotData?: Base64Data;
  department?: string;
  timestamp?: any;
}

/**
 * Add an audit log entry to Firebase
 */
export const addAuditLog = async (data: AuditLogEntry): Promise<string> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const files: { [key: string]: Base64Data } = {};
  if (data.screenshotData) {
    files.screenshot = data.screenshotData;
  }

  const { screenshotData: _screenshotData, ...logData } = data;

  return await addDocumentWithBase64(
    "audit_logs",
    {
      ...logData,
      timestamp: serverTimestamp(),
    },
    Object.keys(files).length > 0 ? files : undefined,
  );
};

/**
 * Get audit logs with optional filters
 */
export const getAuditLogs = async (filters?: {
  adminEmail?: string;
  department?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<DocumentData[]> => {
  if (!db) {
    console.warn("Firestore is not initialized. Returning empty array.");
    return [];
  }

  const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")];

  if (filters?.adminEmail) {
    constraints.push(where("adminEmail", "==", filters.adminEmail));
  }
  if (filters?.department) {
    constraints.push(where("department", "==", filters.department));
  }
  if (filters?.action) {
    constraints.push(where("action", "==", filters.action));
  }
  if (filters?.resource) {
    constraints.push(where("resource", "==", filters.resource));
  }
  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return await getDocuments("audit_logs", constraints);
};

/**
 * Subscribe to real-time audit log updates
 */
export const subscribeToAuditLogs = (
  callback: (logs: DocumentData[]) => void,
  limitCount: number = 50,
): Unsubscribe => {
  return subscribeToCollection("audit_logs", callback, [
    orderBy("timestamp", "desc"),
    limit(limitCount),
  ]);
};

/**
 * Log a user action (helper for common operations)
 */
export const logUserAction = async (
  user: { uid: string; email: string },
  action: AuditLogEntry["action"],
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
): Promise<string> => {
  return await addAuditLog({
    adminId: user.uid,
    adminEmail: user.email,
    action,
    resource,
    resourceId,
    details,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });
};

/**
 * ============================================
 * NOTIFICATIONS - Firebase-based with attachments
 * ============================================
 */

export interface NotificationEntry {
  title: string;
  message: string;
  targetUsers: string[]; // empty array means all users
  imageData?: Base64Data;
  imageText?: string; // Explicit text form storage
  priority?: "low" | "normal" | "high";
  expiresAt?: Date;
  sentBy: string;
  sentByEmail: string;
}

/**
 * Add a notification with optional image attachment
 */
export const addNotification = async (
  data: NotificationEntry,
): Promise<string> => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Please check your Firebase configuration.",
    );
  }

  const files: { [key: string]: Base64Data } = {};
  if (data.imageData) {
    files.image = data.imageData;
  }

  const { imageData: _imageData, expiresAt, ...notificationData } = data;

  // If imageData is provided, ensure imageText is also set (if not already)
  const finalNotificationData =
    data.imageData && !data.imageText
      ? {
          ...notificationData,
          imageText: `data:${data.imageData.mimeType};base64,${data.imageData.data}`,
        }
      : { ...notificationData };

  return await addDocumentWithBase64(
    "notifications",
    {
      ...finalNotificationData,
      sentAt: serverTimestamp(),
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      deliveryCount: 0,
      isRead: false,
    },
    Object.keys(files).length > 0 ? files : undefined,
  );
};

/**
 * Get notifications from Firebase
 */
export const getNotifications = async (filters?: {
  targetUserId?: string;
  onlyUnread?: boolean;
  limit?: number;
}): Promise<DocumentData[]> => {
  if (!db) {
    console.warn("Firestore is not initialized. Returning empty array.");
    return [];
  }

  const constraints: QueryConstraint[] = [orderBy("sentAt", "desc")];

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  return await getDocuments("notifications", constraints);
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string,
): Promise<void> => {
  return await updateDocument("notifications", notificationId, {
    isRead: true,
    readAt: serverTimestamp(),
  });
};

/**
 * Update notification delivery count
 */
export const updateNotificationDeliveryCount = async (
  notificationId: string,
  count: number,
): Promise<void> => {
  return await updateDocument("notifications", notificationId, {
    deliveryCount: count,
  });
};

/**
 * Subscribe to real-time notification updates
 */
export const subscribeToNotifications = (
  callback: (notifications: DocumentData[]) => void,
  limitCount: number = 50,
): Unsubscribe => {
  return subscribeToCollection("notifications", callback, [
    orderBy("sentAt", "desc"),
    limit(limitCount),
  ]);
};
