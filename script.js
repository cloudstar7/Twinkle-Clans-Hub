// --- 1. IMPORTS ---
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- 2. FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyAj04SX2YrStdZFWXkMowRxwBYM7xO2mSg",
  authDomain: "twinkle-clans-hub.firebaseapp.com",
  projectId: "twinkle-clans-hub",
  storageBucket: "twinkle-clans-hub.firebasestorage.app",
  messagingSenderId: "443187160032",
  appId: "1:443187160032:web:e6408e6043b7a607a60185"
};

// init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postsCol = collection(db, "clanPosts");
const metaDocRef = doc(db, "meta", "roles");

// --- 3. STATE ---
const OWNER\_USERNAME = "Cloudstar";
const OWNER\_PASSWORD = "Cloudstar7Wind";
const CONFIRMATION\_CODE = "WCU";

// FIXED PASSWORDS (no numbers in usernames)
const FIXED\_POSTER\_PASSWORDS = {
  "Pinestar": "PineThunder",
  "Grapestar": "GrapeShadow",
  "Willowshine": "Willowshine7",
  "Lakestar": "LakestarRiver"
};

let currentUser = null;
let currentRole = "visitor";
let currentClanFilter = "all";
let promotedUsers = [];
let posterPasswords = { ...FIXED\_POSTER\_PASSWORDS };
let ownerPassword = OWNER\_PASSWORD;
let lastSnapshotDocs = [];

// --- 4. DOM ELEMENTS ---
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const confirmCodeInput = document.getElementById("confirmCodeInput");
const setUsernameBtn = document.getElementById("setUsernameBtn");
const currentUserLabel = document.getElementById("currentUserLabel");

const roleBadge = document.getElementById("roleBadge");
const posterControls = document.getElementById("posterControls");
const ownerControls = document.getElementById("ownerControls");

const postClanSelect = document.getElementById("postClanSelect");
const postTitleInput = document.getElementById("postTitleInput");
const postBodyInput = document.getElementById("postBodyInput");
const publishBtn = document.getElementById("publishBtn");

const promoteInput = document.getElementById("promoteInput");
const promoteBtn = document.getElementById("promoteBtn");
const promotedList = document.getElementById("promotedList
