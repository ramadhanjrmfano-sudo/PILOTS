/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

// Lazy-loaded Supabase client helper
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        console.log("Supabase Client initialized successfully with URL:", supabaseUrl);
      } catch (err: any) {
        console.error("Failed to initialize Supabase Client:", err.message || err);
      }
    }
  }
  return supabaseClient;
}


interface ServerUser {
  id: string;
  name: string;
  username: string;
  phone: string;
  password?: string;
  isApproved: boolean;
  isSuspended?: boolean;
  role: "user" | "admin";
  registeredAt: string;
  registrationDate?: string;
  registrationTime?: string;
  status: "Pending" | "Approved" | "Rejected" | "Suspended";
}

const DB_FILE = path.join(process.cwd(), "users_db.json");

const DEFAULT_USERS: ServerUser[] = [
  {
    id: "admin-node-1",
    name: "System Admin",
    username: "admin",
    phone: "0743288942",
    password: "Examplejr17",
    isApproved: true,
    isSuspended: false,
    role: "admin",
    registeredAt: "2026-06-04 12:00",
    registrationDate: "2026-06-04",
    registrationTime: "12:00:00",
    status: "Approved"
  }
];

function normalizeUser(u: any, docId?: string): ServerUser {
  const isApproved = u.isApproved !== undefined ? !!u.isApproved : false;
  const isSuspended = u.isSuspended !== undefined ? !!u.isSuspended : false;
  let status = u.status;
  if (!status) {
    if (isSuspended) {
      status = "Suspended";
    } else if (isApproved) {
      status = "Approved";
    } else {
      status = "Pending";
    }
  }

  const idVal = u.id || docId || ("member-" + Date.now() + Math.random().toString(36).substring(2, 5));
  const registeredAt = u.registeredAt || new Date().toISOString().replace("T", " ").substring(0, 16);
  // Extract date from "YYYY-MM-DD" style
  const registrationDate = u.registrationDate || (registeredAt.includes("-") ? registeredAt.substring(0, 10) : new Date().toISOString().split("T")[0]);
  const registrationTime = u.registrationTime || (registeredAt.includes(":") ? (registeredAt.substring(11).trim() || "12:00:00") : new Date().toTimeString().split(" ")[0]);

  return {
    id: idVal,
    name: u.name || "",
    username: u.username || u.phone || "",
    phone: u.phone || "",
    password: u.password || "password",
    isApproved: status === "Approved",
    isSuspended: status === "Suspended" || isSuspended,
    role: (u.role || "user") as "user" | "admin",
    registeredAt,
    registrationDate,
    registrationTime,
    status: status as "Pending" | "Approved" | "Rejected" | "Suspended"
  };
}

// Memory cache for super-fast retrieval/polling response
let memoryUsers: ServerUser[] = [...DEFAULT_USERS];

// Load local backup from file
function loadLocalUsers(): ServerUser[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list.map(u => normalizeUser(u));
      }
    }
  } catch (error) {
    console.error("Error reading local backup users database:", error);
  }
  return DEFAULT_USERS;
}

// Save local backup to file
function saveLocalUsers(users: ServerUser[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local backup users database:", error);
  }
}

// Helper to sync user profile to Supabase database if connected
async function syncUserProfileToSupabase(user: ServerUser) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        is_approved: user.isApproved,
        is_suspended: user.isSuspended,
        status: user.status,
        registered_at: user.registeredAt
      });
    if (error) {
      console.warn("Could not sync profile to Supabase database (this is expected if profiles table does not exist):", error.message);
    } else {
      console.log(`Successfully completed profile sync to Supabase for user: ${user.name}`);
    }
  } catch (e: any) {
    console.warn("Supabase profiles table upsert failed:", e.message || e);
  }
}

const REQUESTS_FILE = path.join(process.cwd(), "requests_db.json");
let memoryRequests: any[] = [];

// Failed login attempts tracker Map (7 attempts, 15 minutes lockout)
const loginFailures = new Map<string, { count: number; lockedUntil: number }>();

// Weekly Signals Configuration
export interface WeeklySignal {
  id: string;
  day: string;
  time: string;
  odd: string;
  accuracy: string;
  multiplier: string;
  status: string;
}

export interface AdminUpdate {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  status: string;
}

const WEEKLY_SIGNALS_FILE = path.join(process.cwd(), "weekly_signals_db.json");
let memoryWeeklySignals: WeeklySignal[] = [];

const ADMIN_UPDATES_FILE = path.join(process.cwd(), "admin_updates_db.json");
let memoryAdminUpdates: AdminUpdate[] = [];

function loadLocalAdminUpdates(): AdminUpdate[] {
  try {
    if (fs.existsSync(ADMIN_UPDATES_FILE)) {
      const data = fs.readFileSync(ADMIN_UPDATES_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (error) {
    console.error("Error reading local admin updates database:", error);
  }
  return [];
}

function saveLocalAdminUpdates(updates: AdminUpdate[]) {
  try {
    fs.writeFileSync(ADMIN_UPDATES_FILE, JSON.stringify(updates, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing admin updates database:", error);
  }
}

function loadLocalWeeklySignals(): WeeklySignal[] {
  try {
    if (fs.existsSync(WEEKLY_SIGNALS_FILE)) {
      const data = fs.readFileSync(WEEKLY_SIGNALS_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (error) {
    console.error("Error reading local weekly signals database:", error);
  }

  const defaultSignals: WeeklySignal[] = [
    { id: "ws-1", day: "Jumatatu", time: "12:30 AM", odd: "2.20", accuracy: "97%", multiplier: "2.2x", status: "Active" },
    { id: "ws-2", day: "Jumanne", time: "03:15 PM", odd: "1.85", accuracy: "99%", multiplier: "1.8x", status: "Active" },
    { id: "ws-3", day: "Alhamisi", time: "09:00 AM", odd: "3.50", accuracy: "95%", multiplier: "3.5x", status: "Active" },
    { id: "ws-4", day: "Ijumaa", time: "10:30 PM", odd: "4.20", accuracy: "92%", multiplier: "4.2x", status: "Active" },
    { id: "ws-5", day: "Jumapili", time: "06:45 PM", odd: "2.10", accuracy: "98%", multiplier: "2.1x", status: "Active" }
  ];

  try {
    fs.writeFileSync(WEEKLY_SIGNALS_FILE, JSON.stringify(defaultSignals, null, 2), "utf-8");
  } catch (e) {}

  return defaultSignals;
}

function saveLocalWeeklySignals(sigs: WeeklySignal[]) {
  try {
    fs.writeFileSync(WEEKLY_SIGNALS_FILE, JSON.stringify(sigs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local weekly signals database:", error);
  }
}

// Load local backup from file
function loadLocalRequests(): any[] {
  try {
    if (fs.existsSync(REQUESTS_FILE)) {
      const data = fs.readFileSync(REQUESTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading local backup requests database:", error);
  }
  return [];
}

// Save local backup to file
function saveLocalRequests(reqs: any[]) {
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(reqs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local backup requests database:", error);
  }
}

// Helper to wrap promises with a timeout to prevent hanging connections
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 6000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore operation timed out")), timeoutMs)
    )
  ]);
};

// Initialize Firebase App & Firestore Database using Web Client SDK for public API-key/rules access
let db: any = null;
let rawDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const clientApp = initializeApp(config);
    rawDb = getFirestore(clientApp, config.firestoreDatabaseId);

    // Create a backward-compatible wrapper replicating the Admin SDK API surface
    db = {
      collection(colName: string) {
        return {
          async get() {
            const colRef = collection(rawDb, colName);
            const snap = await withTimeout(getDocs(colRef));
            return {
              empty: snap.empty,
              docs: snap.docs.map(d => ({
                id: d.id,
                ref: doc(rawDb, colName, d.id),
                data: () => d.data()
              })),
              forEach(cb: (doc: any) => void) {
                snap.docs.forEach(d => {
                  cb({
                    id: d.id,
                    ref: doc(rawDb, colName, d.id),
                    data: () => d.data()
                  });
                });
              }
            };
          },
          where(field: string, op: string, value: any) {
            return {
              async get() {
                const colRef = collection(rawDb, colName);
                const q = query(colRef, where(field, op === "==" ? "==" : op as any, value));
                const snap = await withTimeout(getDocs(q));
                return {
                  empty: snap.empty,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    ref: doc(rawDb, colName, d.id),
                    data: () => d.data()
                  })),
                  forEach(cb: (doc: any) => void) {
                    snap.docs.forEach(d => {
                      cb({
                        id: d.id,
                        ref: doc(rawDb, colName, d.id),
                        data: () => d.data()
                      });
                    });
                  }
                };
              }
            };
          },
          doc(docId: string) {
            return {
              async set(data: any) {
                const docRef = doc(rawDb, colName, docId);
                await withTimeout(setDoc(docRef, data));
              },
              async delete() {
                const docRef = doc(rawDb, colName, docId);
                await withTimeout(deleteDoc(docRef));
              }
            };
          }
        };
      },
      batch() {
        const b = writeBatch(rawDb);
        return {
          delete(ref: any) {
            b.delete(ref);
          },
          async commit() {
            await withTimeout(b.commit());
          }
        };
      }
    };
    console.log("Firestore client SDK initialized successfully on server with databaseId:", config.firestoreDatabaseId);
  } else {
    console.warn("firebase-applet-config.json not found. Falling back to local offline storage.");
  }
} catch (e) {
  console.error("Error initializing Firestore client, using fallback local file storage:", e);
}

// Sync in-memory and local disk cache with Firestore
async function syncWithFirestore() {
  if (!db) {
    memoryUsers = loadLocalUsers();
    return;
  }

  try {
    console.log("Syncing users from Firestore via Admin SDK...");
    const querySnapshot = await db.collection("users").get();
    const list: ServerUser[] = [];
    querySnapshot.forEach((docSnap: any) => {
      list.push(normalizeUser(docSnap.data(), docSnap.id));
    });

    if (list.length > 0) {
      memoryUsers = list;
      saveLocalUsers(memoryUsers);
      console.log(`Loaded ${list.length} users successfully from Firestore database.`);
    } else {
      console.log("Firestore is empty. Seeding with default users list...");
      memoryUsers = [...DEFAULT_USERS];
      saveLocalUsers(memoryUsers);
      // Seed default admin in Firestore
      for (const u of memoryUsers) {
        await db.collection("users").doc(u.id).set(u);
      }
    }
  } catch (error) {
    console.error("Failed to sync users with Firestore, falling back to disk cache:", error);
    memoryUsers = loadLocalUsers();
  }
}

// Sync signal requests from Firestore
async function syncRequestsWithFirestore() {
  if (!db) {
    memoryRequests = loadLocalRequests();
    return;
  }

  try {
    console.log("Syncing requests from Firestore via Admin SDK...");
    const querySnapshot = await db.collection("requests").get();
    const list: any[] = [];
    querySnapshot.forEach((docSnap: any) => {
      list.push(docSnap.data());
    });

    if (list.length > 0) {
      // Sort in descending order of actual time using js if timestamp field is formatted
      list.sort((a: any, b: any) => (b.id || "").localeCompare(a.id || ""));
      memoryRequests = list;
      saveLocalRequests(memoryRequests);
      console.log(`Loaded ${list.length} requested signal logs successfully from Firestore.`);
    } else {
      memoryRequests = loadLocalRequests();
    }
  } catch (error) {
    console.error("Failed to sync requests with Firestore, falling back to disk cache:", error);
    memoryRequests = loadLocalRequests();
  }
}

// Sync weekly signals from Firestore
async function syncWeeklySignalsWithFirestore() {
  if (!db) {
    memoryWeeklySignals = loadLocalWeeklySignals();
    return;
  }

  try {
    console.log("Syncing weekly signals from Firestore via Admin SDK...");
    const querySnapshot = await db.collection("weekly_signals").get();
    const list: WeeklySignal[] = [];
    querySnapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      list.push({
        id: data.id || docSnap.id,
        day: data.day || "Jumatatu",
        time: data.time || "12:00 PM",
        odd: data.odd || "1.50",
        accuracy: data.accuracy || "95%",
        multiplier: data.multiplier || "1.5x",
        status: data.status || "Active"
      });
    });

    if (list.length > 0) {
      memoryWeeklySignals = list;
      saveLocalWeeklySignals(memoryWeeklySignals);
      console.log(`Loaded ${list.length} weekly signals successfully from Firestore.`);
    } else {
      console.log("Firestore weekly_signals is empty. Seeding defaults...");
      memoryWeeklySignals = loadLocalWeeklySignals();
      for (const sig of memoryWeeklySignals) {
        await db.collection("weekly_signals").doc(sig.id).set(sig);
      }
    }
  } catch (error) {
    console.error("Failed to sync weekly signals with Firestore, falling back to disk cache:", error);
    memoryWeeklySignals = loadLocalWeeklySignals();
  }
}

// Sync admin updates from Firestore
async function syncAdminUpdatesWithFirestore() {
  if (!db) {
    memoryAdminUpdates = loadLocalAdminUpdates();
    return;
  }

  try {
    console.log("Syncing admin updates from Firestore DB...");
    const querySnapshot = await db.collection("admin_updates").get();
    const list: AdminUpdate[] = [];
    querySnapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      list.push({
        id: data.id || docSnap.id,
        title: data.title || "Kuhusu Mfumo",
        message: data.message || "",
        createdAt: data.createdAt || new Date().toISOString(),
        status: data.status || "Active"
      });
    });

    if (list.length > 0) {
      memoryAdminUpdates = list;
      saveLocalAdminUpdates(memoryAdminUpdates);
      console.log(`Loaded ${list.length} admin updates from Firestore.`);
    } else {
      console.log("Firestore admin_updates is empty. Seeding defaults...");
      memoryAdminUpdates = loadLocalAdminUpdates();
      for (const upd of memoryAdminUpdates) {
        await db.collection("admin_updates").doc(upd.id).set(upd);
      }
    }
  } catch (error) {
    console.error("Failed to sync admin updates with Firestore, falling back to disk cache:", error);
    memoryAdminUpdates = loadLocalAdminUpdates();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Instant load from local fallback files to ensure first response is ultra-fast and never blocked
  memoryUsers = loadLocalUsers();
  memoryRequests = loadLocalRequests();
  memoryWeeklySignals = loadLocalWeeklySignals();
  memoryAdminUpdates = loadLocalAdminUpdates();

  // Asynchronously trigger Firestore sync in the background so applet is ready instantly
  syncWithFirestore().catch(e => console.error("Immediate background Firestore users sync failed:", e));
  syncRequestsWithFirestore().catch(e => console.error("Immediate background Firestore requests sync failed:", e));
  syncWeeklySignalsWithFirestore().catch(e => console.error("Immediate background Firestore weekly signals sync failed:", e));
  syncAdminUpdatesWithFirestore().catch(e => console.error("Immediate background Firestore admin updates sync failed:", e));

  // Periodically refresh cache from Firestore (e.g. every 10 seconds)
  // to ensure multi-instance serverless sync is seamless
  if (db) {
    setInterval(async () => {
      try {
        const querySnapshot = await db.collection("users").get();
        const list: ServerUser[] = [];
        querySnapshot.forEach((docSnap: any) => {
          list.push(normalizeUser(docSnap.data(), docSnap.id));
        });
        if (list.length > 0) {
          memoryUsers = list;
          saveLocalUsers(memoryUsers);
        }
      } catch (e) {
        console.error("Periodic background Firestore style sync failed:", e);
      }

      try {
        const querySnapshot = await db.collection("requests").get();
        const list: any[] = [];
        querySnapshot.forEach((docSnap: any) => {
          list.push(docSnap.data());
        });
        if (list.length > 0) {
          // Sort newest first before saving to memory cache
          list.sort((a: any, b: any) => (b.id || "").localeCompare(a.id || ""));
          memoryRequests = list;
          saveLocalRequests(memoryRequests);
        }
      } catch (e) {
        console.error("Periodic background Firestore requests sync failed:", e);
      }

      try {
        const querySnapshot = await db.collection("weekly_signals").get();
        const list: WeeklySignal[] = [];
        querySnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          list.push({
            id: data.id || docSnap.id,
            day: data.day || "Jumatatu",
            time: data.time || "12:00 PM",
            odd: data.odd || "1.50",
            accuracy: data.accuracy || "95%",
            multiplier: data.multiplier || "1.5x",
            status: data.status || "Active"
          });
        });
        if (list.length > 0) {
          memoryWeeklySignals = list;
          saveLocalWeeklySignals(memoryWeeklySignals);
        }
      } catch (e) {
        console.error("Periodic background Firestore weekly signals sync failed:", e);
      }
    }, 10000);
  }

  // API Route: Get all users (for Admin dashboard) [Live synced with Firestore]
  app.get("/api/users", async (req, res) => {
    if (db) {
      try {
        const querySnapshot = await db.collection("users").get();
        const list: ServerUser[] = [];
        querySnapshot.forEach((docSnap: any) => {
          list.push(normalizeUser(docSnap.data(), docSnap.id));
        });
        if (list.length > 0) {
          memoryUsers = list;
          saveLocalUsers(memoryUsers);
        }
        return res.json(list);
      } catch (e) {
        console.error("Failed to read users live from Firestore, falling back:", e);
      }
    }
    res.json(memoryUsers);
  });

  // API Route: Register a new user
  app.post("/api/register", async (req, res) => {
    const { name, username, phone, password } = req.body;
    
    if (!name || !username || !phone || !password) {
      return res.status(400).json({ error: "Tafadhali jaza taarifa zote zinazotakiwa." });
    }

    const trimmedPhone = phone.trim();
    const trimmedUsername = username.trim();
    
    const existingPhone = memoryUsers.find(u => u.phone.trim() === trimmedPhone);
    if (existingPhone) {
      return res.status(400).json({ error: "Namba hii ya simu tayari imesajiliwa kwenye mfumo." });
    }

    const existingUsername = memoryUsers.find(u => u.username && u.username.trim().toLowerCase() === trimmedUsername.toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ error: "Username hii tayari imesajiliwa na mtu mwingine." });
    }

    const d = new Date();
    const registrationDate = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const registrationTime = d.toTimeString().split(" ")[0]; // HH:MM:SS
    const registeredAt = `${registrationDate} ${registrationTime.substring(0, 5)}`;

    const newUser: ServerUser = {
      id: "member-" + Date.now() + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      username: trimmedUsername,
      phone: trimmedPhone,
      password: password,
      isApproved: false,
      isSuspended: false,
      role: "user",
      registeredAt,
      registrationDate,
      registrationTime,
      status: "Pending"
    };

    // Attempt to register in Supabase Auth if services are configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const email = `${trimmedUsername.toLowerCase().replace(/[^a-z0-9]/g, "")}@pilot.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
              phone: trimmedPhone,
              username: trimmedUsername,
              role: "user"
            }
          }
        });

        if (authError) {
          console.warn("Supabase Auth sign up registration failed:", authError.message);
        } else if (authData?.user) {
          console.log("Supabase Auth sign up registration successful:", authData.user.id);
          newUser.id = authData.user.id;
        }
      } catch (err: any) {
        console.error("Critical error during Supabase Auth register integration:", err.message || err);
      }
    }

    memoryUsers.push(newUser);
    saveLocalUsers(memoryUsers);

    // Save to Firestore asynchronously
    if (db) {
      try {
        await db.collection("users").doc(newUser.id).set(newUser);
      } catch (e) {
        console.error("Failed to write new user to Firestore:", e);
      }
    }

    // Sync profile table structure in Supabase asynchronously
    if (supabase) {
      syncUserProfileToSupabase(newUser).catch(e => console.error("Async Supabase profile upsert failed:", e));
    }

    res.json(newUser);
  });

  // API Route: Login user (Includes 7 attempts lockout for 15 minutes security)
  app.post("/api/login", async (req, res) => {
    const { phone, password } = req.body; // Identifier input

    if (!phone || !password) {
      return res.status(400).json({ error: "Tafadhali jaza jina la mtumiaji/namba ya simu na password." });
    }

    const trimmedInput = phone.trim();
    const normalizedKey = trimmedInput.toLowerCase();

    // Check if currently locked out
    const failureRecord = loginFailures.get(normalizedKey);
    if (failureRecord && failureRecord.count >= 7 && Date.now() < failureRecord.lockedUntil) {
      const remainingMs = failureRecord.lockedUntil - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return res.status(403).json({
        error: `Akaunti yako imezuiwa kwa usalama kwa muda wa dakika 15 baada ya kukosea password mara 7. Tafadhali subiri dakika ${remainingMins} kabla ya kujaribu tena!`,
        locked: true,
        minutesLeft: remainingMins
      });
    }

    // Check master admin override
    if ((trimmedInput === "0743288942" || trimmedInput.toLowerCase() === "admin") && password === "Examplejr17") {
      loginFailures.delete(normalizedKey); // Reset on success
      let adminUser = memoryUsers.find(u => u.role === "admin");
      if (!adminUser) {
        adminUser = {
          id: "admin-node-1",
          name: "System Admin",
          username: "admin",
          phone: "0743288942",
          password: "Examplejr17",
          isApproved: true,
          isSuspended: false,
          role: "admin",
          registeredAt: "2026-06-04 12:00",
          registrationDate: "2026-06-04",
          registrationTime: "12:00:00",
          status: "Approved"
        };
        memoryUsers.push(adminUser);
        saveLocalUsers(memoryUsers);
        if (db) {
          try { await db.collection("users").doc(adminUser.id).set(adminUser); } catch(e) {}
        }
      }
      return res.json(adminUser);
    }

    let user: ServerUser | undefined = undefined;

    // If Supabase client is active, attempt Supabase Auth logging in
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Find matching user locally first to retrieve their username if they input a phone number
        const matchedLocal = memoryUsers.find(u => 
          u.phone.trim() === trimmedInput || 
          (u.username && u.username.trim().toLowerCase() === trimmedInput.toLowerCase())
        );
        
        const usernameForEmail = matchedLocal?.username || trimmedInput;
        const email = `${usernameForEmail.toLowerCase().replace(/[^a-z0-9]/g, "")}@pilot.com`;

        console.log(`Attempting Supabase Auth sign-in for email: ${email}`);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          console.warn("Supabase Auth sign-in attempt failed, falling back to local credentials DB:", authError.message);
        } else if (authData?.user) {
          console.log("Supabase Auth sign-in succeeded as:", authData.user.id);
          
          // Let's resolve the user object
          let authenticatedUserRef = memoryUsers.find(u => u.id === authData.user.id);
          if (!authenticatedUserRef) {
            // Find by phone or username
            authenticatedUserRef = memoryUsers.find(u => 
              u.phone.trim() === trimmedInput || 
              (u.username && u.username.trim().toLowerCase() === trimmedInput.toLowerCase())
            );
          }

          if (authenticatedUserRef) {
            authenticatedUserRef.id = authData.user.id;
            authenticatedUserRef.password = password; // Sync password
            saveLocalUsers(memoryUsers);
            user = authenticatedUserRef;
          } else {
            // Bootstrap a local/Firestore record matching Supabase
            const meta = authData.user.user_metadata || {};
            const d = new Date();
            const registrationDate = d.toISOString().split("T")[0];
            const registrationTime = d.toTimeString().split(" ")[0];
            const registeredAt = `${registrationDate} ${registrationTime.substring(0, 5)}`;

            user = {
              id: authData.user.id,
              name: meta.name || trimmedInput,
              username: meta.username || trimmedInput,
              phone: meta.phone || trimmedInput,
              password: password,
              isApproved: false,
              isSuspended: false,
              role: (meta.role || "user") as "user" | "admin",
              registeredAt,
              registrationDate,
              registrationTime,
              status: "Pending"
            };
            memoryUsers.push(user);
            saveLocalUsers(memoryUsers);
            if (db) {
              try { await db.collection("users").doc(user.id).set(user); } catch(e) {}
            }
          }

          // Asynchronously sync profiles table
          syncUserProfileToSupabase(user).catch(e => console.error("Async Supabase profile upsert failed:", e));
        }
      } catch (err: any) {
        console.error("Critical error during Supabase Auth login integration:", err.message || err);
      }
    }

    if (!user) {
      // Standard Local / Firestore Backup verification fallback
      let matchedLocalUser = memoryUsers.find(u => 
        (u.phone.trim() === trimmedInput || (u.username && u.username.trim().toLowerCase() === trimmedInput.toLowerCase())) && 
        u.password === password
      );

      if (db) {
        try {
          const queryPhone = await db.collection("users").where("phone", "==", trimmedInput).get();
          let matchedDoc: any = null;
          if (!queryPhone.empty) {
            matchedDoc = queryPhone.docs[0];
          } else {
            const queryUser = await db.collection("users").where("username", "==", trimmedInput).get();
            if (!queryUser.empty) {
              matchedDoc = queryUser.docs[0];
            }
          }

          if (matchedDoc) {
            const fetchedUser = normalizeUser(matchedDoc.data(), matchedDoc.id);
            if (fetchedUser.password === password) {
              matchedLocalUser = fetchedUser;
              const listIndex = memoryUsers.findIndex(u => u.id === matchedLocalUser!.id);
              if (listIndex >= 0) {
                memoryUsers[listIndex] = matchedLocalUser;
              } else {
                memoryUsers.push(matchedLocalUser);
              }
              saveLocalUsers(memoryUsers);
            }
          }
        } catch (e) {
          console.error("Failed to query live user during fallback login:", e);
        }
      }
      user = matchedLocalUser;
    }

    if (!user) {
      // Login failed - update record
      const record = loginFailures.get(normalizedKey) || { count: 0, lockedUntil: 0 };
      record.count += 1;
      
      if (record.count >= 7) {
        record.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
        loginFailures.set(normalizedKey, record);
        return res.status(403).json({
          error: "WARNING: Umekosea password mara 7! Umezuiwa (lockout) kutumia mfumo huu kwa muda wa dakika 15 kwa usalama kutokana na udukuzi.",
          locked: true,
          minutesLeft: 15
        });
      } else {
        loginFailures.set(normalizedKey, record);
        const attemptsLeft = 7 - record.count;
        return res.status(401).json({
          error: `Jina la mtumiaji au password si sahihi! Una nafasi ${attemptsLeft} zaidi kabla ya kuzuiliwa kwa dakika 15.`,
          attemptsLeft
        });
      }
    }

    // Login successful - Reset failure tracker
    loginFailures.delete(normalizedKey);
    res.json(user);
  });

  // API Route: Get weekly signals
  app.get("/api/weekly-signals", (req, res) => {
    res.json(memoryWeeklySignals);
  });

  // API Route: Create or update weekly signal
  app.post("/api/weekly-signals", async (req, res) => {
    const { id, day, time, odd, accuracy, multiplier, status } = req.body;

    if (!day || !time || !odd) {
      return res.status(400).json({ error: "Tafadhali jaza Siku, Muda, na Odds zote!" });
    }

    const sigId = id || "ws-" + Date.now() + Math.random().toString(36).substring(2, 5);
    const updatedSignal: WeeklySignal = {
      id: sigId,
      day,
      time,
      odd,
      accuracy: accuracy || "95%",
      multiplier: multiplier || (odd + "x"),
      status: status || "Active"
    };

    const existingIndex = memoryWeeklySignals.findIndex(s => s.id === sigId);
    if (existingIndex >= 0) {
      memoryWeeklySignals[existingIndex] = updatedSignal;
    } else {
      memoryWeeklySignals.push(updatedSignal);
    }

    saveLocalWeeklySignals(memoryWeeklySignals);

    if (db) {
      try {
        await db.collection("weekly_signals").doc(sigId).set(updatedSignal);
      } catch (e) {
        console.error("Failed to write weekly signal to Firestore:", e);
      }
    }

    res.json({ success: true, signal: updatedSignal });
  });

  // API Route: Delete weekly signal
  app.post("/api/weekly-signals/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Kitambulisho cha signal hakijapatikana." });
    }

    memoryWeeklySignals = memoryWeeklySignals.filter(s => s.id !== id);
    saveLocalWeeklySignals(memoryWeeklySignals);

    if (db) {
      try {
        await db.collection("weekly_signals").doc(id).delete();
      } catch (e) {
        console.error("Failed to delete weekly signal from Firestore:", e);
      }
    }

    res.json({ success: true });
  });

  // API Route: Toggle user approval status
  app.post("/api/users/approve", async (req, res) => {
    const { userId, status, isApproved, isSuspended } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "ID ya mtumiaji inahitajika." });
    }

    let updatedUser: ServerUser | null = null;
    const updatedUsers = memoryUsers.map(u => {
      if (u.id === userId) {
        let finalStatus = status;
        let finalApproved = isApproved;
        let finalSuspended = isSuspended;

        if (finalStatus !== undefined) {
          finalApproved = (finalStatus === "Approved");
          finalSuspended = (finalStatus === "Suspended");
        } else {
          // Resolve from boolean fields if status wasn't explicit
          if (finalApproved !== undefined && finalSuspended !== undefined) {
            finalStatus = finalSuspended ? "Suspended" : finalApproved ? "Approved" : "Pending";
          } else if (finalApproved !== undefined) {
            finalStatus = finalApproved ? "Approved" : "Pending";
            finalSuspended = false;
          } else if (finalSuspended !== undefined) {
            finalStatus = finalSuspended ? "Suspended" : (u.isApproved ? "Approved" : "Pending");
            finalApproved = finalStatus === "Approved";
          } else {
            finalStatus = u.status || "Pending";
            finalApproved = u.isApproved;
            finalSuspended = u.isSuspended;
          }
        }

        updatedUser = { 
          ...u, 
          status: finalStatus,
          isApproved: finalApproved,
          isSuspended: finalSuspended
        };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "Mtumiaji hajapatikana." });
    }

    memoryUsers = updatedUsers;
    saveLocalUsers(memoryUsers);

    // Save update to Firestore
    if (db && updatedUser) {
      try {
        await db.collection("users").doc(userId).set(updatedUser);
      } catch (e) {
        console.error("Failed to update user approval in Firestore:", e);
      }
    }

    if (updatedUser) {
      syncUserProfileToSupabase(updatedUser).catch(e => console.error("Async Supabase profile approval sync failed:", e));
    }

    res.json({ success: true, user: updatedUser });
  });

  // API Route: Delete user
  app.post("/api/users/delete", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "ID ya mtumiaji inahitajika." });
    }

    const filtered = memoryUsers.filter(u => u.id !== userId);

    if (memoryUsers.length === filtered.length) {
      return res.status(404).json({ error: "Mtumiaji hajapatikana." });
    }

    memoryUsers = filtered;
    saveLocalUsers(memoryUsers);

    // Remove from Firestore
    if (db) {
      try {
        await db.collection("users").doc(userId).delete();
      } catch (e) {
        console.error("Failed to delete user from Firestore:", e);
      }
    }

    res.json({ success: true });
  });

  // API Route: Gossip Sync endpoint to restore/merge user records from client backups
  app.post("/api/users/sync", async (req, res) => {
    const clientUsers = req.body;
    if (!Array.isArray(clientUsers)) {
      return res.status(400).json({ error: "Invalid sync package." });
    }

    let changed = false;

    for (const clientUser of clientUsers) {
      if (!clientUser || !clientUser.phone) continue;
      
      const exists = memoryUsers.find(u => u.phone.trim() === clientUser.phone.trim());
      if (!exists) {
        // Restore user to server memory database
        const restoredUser: ServerUser = normalizeUser(clientUser);
        memoryUsers.push(restoredUser);
        changed = true;

        if (db) {
          try {
            await db.collection("users").doc(restoredUser.id).set(restoredUser);
          } catch (e) {
            console.error("Gossip Sync Firestore write failed:", e);
          }
        }
      }
    }

    if (changed) {
      saveLocalUsers(memoryUsers);
    }

    res.json(memoryUsers);
  });

  // API Route: Save a new signal request (log entry) to Firestore
  app.post("/api/requests", async (req, res) => {
    const { userId, userName, userPhone, signalTime, mode, status, timestamp } = req.body;

    if (!userPhone) {
      return res.status(400).json({ error: "Namba ya simu ya mtumiaji inahitajika." });
    }

    // Security guard: verify if user is approved and not suspended
    let user = memoryUsers.find(u => u.phone.trim() === userPhone.trim());
    if (db) {
      try {
        const querySnapshot = await db.collection("users").where("phone", "==", userPhone.trim()).get();
        if (!querySnapshot.empty) {
          user = normalizeUser(querySnapshot.docs[0].data(), querySnapshot.docs[0].id);
          const listIndex = memoryUsers.findIndex(u => u.id === user!.id);
          if (listIndex >= 0) {
            memoryUsers[listIndex] = user;
          } else {
            memoryUsers.push(user);
          }
          saveLocalUsers(memoryUsers);
        }
      } catch (e) {
        console.error("Failed to query live user status for request submission:", e);
      }
    }

    if (!user) {
      return res.status(404).json({ error: "Mtumiaji huyu hayupo kwenye mfumo." });
    }

    if (!user.isApproved && user.role !== "admin") {
      return res.status(403).json({ error: "Akaunti yako haijapitishwa kutumia mfumo huu." });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: "Akaunti yako imesitishwa kutumika kwa muda." });
    }

    const newRequest = {
      id: "req-" + Date.now() + Math.random().toString(36).substring(2, 5),
      userId: userId || user.id,
      userName: userName || user.name,
      userPhone: userPhone,
      signalTime: signalTime || "--:--:--",
      mode: mode || "SCHEDULE",
      status: status || "READY",
      timestamp: timestamp || new Date().toTimeString().split(' ')[0]
    };

    memoryRequests.unshift(newRequest);
    // Keep a reasonable bound on memory log history
    if (memoryRequests.length > 500) {
      memoryRequests = memoryRequests.slice(0, 500);
    }
    saveLocalRequests(memoryRequests);

    if (db) {
      try {
        await db.collection("requests").doc(newRequest.id).set(newRequest);
      } catch (e) {
        console.error("Failed to write request log to Firestore:", e);
      }
    }

    res.json({ success: true, request: newRequest });
  });

  // API Route: Get all signal requests or filter by user phone number [Live synced with Firestore]
  app.get("/api/requests", async (req, res) => {
    const { phone } = req.query;
    
    if (db) {
      try {
        const querySnapshot = await db.collection("requests").get();
        const list: any[] = [];
        querySnapshot.forEach((docSnap: any) => {
          list.push(docSnap.data());
        });
        
        // Sort newest first based on alphanumeric ID or string timestamp
        list.sort((a: any, b: any) => (b.id || "").localeCompare(a.id || ""));
        
        // Update local memory and file backup
        memoryRequests = list;
        saveLocalRequests(memoryRequests);
        
        if (phone) {
          const filtered = list.filter(r => r.userPhone && r.userPhone.trim() === (phone as string).trim());
          return res.json(filtered);
        }
        return res.json(list);
      } catch (e) {
        console.error("Failed to read requests live from Firestore, falling back:", e);
      }
    }

    if (phone) {
      const filtered = memoryRequests.filter(r => r.userPhone && r.userPhone.trim() === (phone as string).trim());
      return res.json(filtered);
    }
    
    const sortedMemory = [...memoryRequests].sort((a: any, b: any) => (b.id || "").localeCompare(a.id || ""));
    res.json(sortedMemory);
  });

  // API Route: Clear all requests (for Admin)
  app.post("/api/requests/clear", async (req, res) => {
    memoryRequests = [];
    saveLocalRequests([]);

    if (db) {
      try {
        const docs = await db.collection("requests").get();
        const batch = db.batch();
        docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to clear requests from Firestore:", e);
      }
    }

    res.json({ success: true });
  });

  // API Route: Get all admin updates
  app.get("/api/admin-updates", (req, res) => {
    res.json(memoryAdminUpdates || []);
  });

  // API Route: Save or edit admin update
  app.post("/api/admin-updates", async (req, res) => {
    const { id, title, message, status } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Tafadhali jaza Kichwa cha habari na Ujumbe!" });
    }

    const updId = id || "upd-" + Date.now() + Math.random().toString(36).substring(2, 5);
    const updatedAnnounce: AdminUpdate = {
      id: updId,
      title,
      message,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: status || "Active"
    };

    const existingIndex = memoryAdminUpdates.findIndex(u => u.id === updId);
    if (existingIndex >= 0) {
      memoryAdminUpdates[existingIndex] = updatedAnnounce;
    } else {
      memoryAdminUpdates.unshift(updatedAnnounce); // Put newest first
    }

    saveLocalAdminUpdates(memoryAdminUpdates);

    if (db) {
      try {
        await db.collection("admin_updates").doc(updId).set(updatedAnnounce);
      } catch (e) {
        console.error("Failed to write admin update to Firestore:", e);
      }
    }

    res.json({ success: true, update: updatedAnnounce });
  });

  // API Route: Delete admin update
  app.post("/api/admin-updates/delete", async (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Kitambulisho cha update hakijapatikana." });
    }

    memoryAdminUpdates = memoryAdminUpdates.filter(u => u.id !== id);
    saveLocalAdminUpdates(memoryAdminUpdates);

    if (db) {
      try {
        await db.collection("admin_updates").doc(id).delete();
      } catch (e) {
        console.error("Failed to delete admin update from Firestore:", e);
      }
    }

    res.json({ success: true });
  });

  // API Route: Check Supabase connection status
  app.get("/api/supabase-status", (req, res) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
    res.json({
      configured: !!(url && hasKey),
      url: url || null,
      usingServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
