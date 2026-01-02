// script.js
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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================
// 1. CONFIGURE FIREBASE
// =====================

// TODO: replace with your project config from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyAj04SX2YrStdZFWXkMowRxwBYM7xO2mSg",
  authDomain: "twinkle-clans-hub.firebaseapp.com",
  projectId: "twinkle-clans-hub",
  storageBucket: "twinkle-clans-hub.firebasestorage.app",
  messagingSenderId: "443187160032",
  appId: "1:443187160032:web:e6408e6043b7a607a60185"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postsCol = collection(db, "clanPosts");
const metaDocRef = doc(db, "meta", "roles");

// =================
// 2. BASIC STATE
// =================

const OWNER_USERNAME = "Cloudstar";

let currentUser = null;
let currentRole = "visitor"; // "owner" | "poster" | "visitor"
let currentClanFilter = "all";

// =================
// 3. DOM REFERENCES
// =================

const usernameInput = document.getElementById("usernameInput");
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
const promotedList = document.getElementById("promotedList");

const postsContainer = document.getElementById("postsContainer");
const feedTitle = document.getElementById("feedTitle");
const clanButtons = document.querySelectorAll(".clan-btn");

// ======================
// 4. ROLE MANAGEMENT
// ======================

let promotedUsers = []; // from Firestore

async function loadRoles() {
  const snap = await getDoc(metaDocRef);
  if (!snap.exists()) {
    // initialize meta doc on first run
    await setDoc(metaDocRef, { promoted: [] });
    promotedUsers = [];
  } else {
    const data = snap.data();
    promotedUsers = data.promoted || [];
  }
  renderPromotedList();
  updateRoleFromUsername();
}

function renderPromotedList() {
  promotedList.innerHTML = "";
  promotedUsers.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    promotedList.appendChild(li);
  });
}

async function promoteUser() {
  const name = promoteInput.value.trim();
  if (!name) return;
  if (name === OWNER_USERNAME) {
    alert("Cloudstar is already the owner.");
    return;
  }
  if (promotedUsers.includes(name)) {
    alert("User is already promoted.");
    return;
  }
  promotedUsers.push(name);
  await setDoc(metaDocRef, { promoted: promotedUsers }, { merge: true });
  promoteInput.value = "";
  renderPromotedList();
  alert(`Promoted ${name} as a poster.`);
}

function updateRoleFromUsername() {
  if (!currentUser) {
    currentRole = "visitor";
  } else if (currentUser === OWNER_USERNAME) {
    currentRole = "owner";
  } else if (promotedUsers.includes(currentUser)) {
    currentRole = "poster";
  } else {
    currentRole = "visitor";
  }
  applyRoleUI();
}

function applyRoleUI() {
  if (!currentUser) {
    currentUserLabel.textContent = "(no username set)";
  } else {
    currentUserLabel.textContent = `Logged in as: ${currentUser}`;
  }

  if (currentRole === "owner") {
    roleBadge.textContent = "Owner";
    roleBadge.style.background = "#eab308";
    posterControls.style.display = "block";
    ownerControls.style.display = "block";
  } else if (currentRole === "poster") {
    roleBadge.textContent = "Poster";
    roleBadge.style.background = "#22c55e";
    posterControls.style.display = "block";
    ownerControls.style.display = "none";
  } else {
    roleBadge.textContent = "Visitor";
    roleBadge.style.background = "#4b5563";
    posterControls.style.display = "none";
    ownerControls.style.display = "none";
  }
}

// ======================
// 5. POSTS HANDLING
// ======================

function renderPost(docSnap) {
  const data = docSnap.data();
  const wrapper = document.createElement("article");
  wrapper.className = "post";

  const header = document.createElement("div");
  header.className = "post-header";

  const titleEl = document.createElement("div");
  titleEl.className = "post-title";
  titleEl.textContent = data.title || "(no title)";

  const metaEl = document.createElement("div");
  metaEl.className = "post-meta";

  const userSpan = document.createElement("span");
  userSpan.textContent = data.author || "Unknown";

  const timeSpan = document.createElement("span");
  const date = data.createdAt?.toDate
    ? data.createdAt.toDate()
    : new Date(data.createdAt || Date.now());
  timeSpan.textContent = " · " + date.toLocaleString();

  const clanTag = document.createElement("span");
  clanTag.className =
    "post-clan-tag post-clan-" + (data.clan || "Unknown").replace(" ", "");
  clanTag.textContent = data.clan;

  metaEl.appendChild(userSpan);
  metaEl.appendChild(timeSpan);
  metaEl.appendChild(clanTag);

  header.appendChild(titleEl);
  header.appendChild(metaEl);

  const bodyEl = document.createElement("div");
  bodyEl.className = "post-body";
  bodyEl.textContent = data.body;

  wrapper.appendChild(header);
  wrapper.appendChild(bodyEl);

  return wrapper;
}

function clearPosts() {
  postsContainer.innerHTML = "";
}

function updateFeedTitle() {
  if (currentClanFilter === "all") {
    feedTitle.textContent = "All Clan News";
  } else {
    feedTitle.textContent = currentClanFilter + " News";
  }
}

// store last snapshot so filters work instantly
let lastSnapshotDocs = [];

function setupPostsListener() {
  const q = query(postsCol, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    lastSnapshotDocs = [];
    snapshot.forEach((docSnap) => {
      lastSnapshotDocs.push({ id: docSnap.id, docSnap });
    });
    renderFilteredPosts(lastSnapshotDocs);
  });
}
function renderFilteredPosts(allPosts) {
  clearPosts();

  console.log("=== RENDER FILTERED POSTS ===");
  console.log("Current filter:", currentClanFilter);

  const filtered = allPosts.filter((p) => {
    const data = p.docSnap.data();
    console.log("Post title:", data.title, "| clan:", data.clan);
    if (currentClanFilter === "all") return true;
    return data.clan === currentClanFilter;
  });

  console.log("Filtered count:", filtered.length);

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No posts yet for this filter.";
    empty.style.color = "#9ca3af";
    postsContainer.appendChild(empty);
    return;
  }

  filtered.forEach((p) => {
    const postEl = renderPost(p.docSnap);
    postsContainer.appendChild(postEl);
  });
}

async function publishPost() {
  if (!currentUser) {
    alert("Set a username first.");
    return;
  }
  if (currentRole === "visitor") {
    alert("You do not have permission to post.");
    return;
  }

  const clan = postClanSelect.value;
  const title = postTitleInput.value.trim();
  const body = postBodyInput.value.trim();

  if (!body) {
    alert("Message cannot be empty.");
    return;
  }

  try {
    await addDoc(postsCol, {
      clan,
      title: title || "(no title)",
      body,
      author: currentUser,
      createdAt: new Date()
    });
    postTitleInput.value = "";
    postBodyInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error publishing post. Check console for details.");
  }
}

// ======================
// 6. USERNAME HANDLING
// ======================

function setUsername() {
  const name = usernameInput.value.trim();
  if (!name) return;
  currentUser = name;
  localStorage.setItem("tch_username", currentUser);
  updateRoleFromUsername();
}

// ======================
// 7. CLAN FILTER BUTTONS
// ======================

function setupClanButtons() {
  clanButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clanButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentClanFilter = btn.dataset.clan; // VERY IMPORTANT
      updateFeedTitle();
      renderFilteredPosts(lastSnapshotDocs);
    });
  });
}

// improve: store last snapshot so filters work instantly
let lastSnapshotDocs = [];
function setupPostsListenerWithCache() {
  const q = query(postsCol, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    lastSnapshotDocs = [];
    snapshot.forEach((docSnap) => {
      lastSnapshotDocs.push({ id: docSnap.id, docSnap });
    });
    renderFilteredPosts(lastSnapshotDocs);
  });
}

// Overwrite older function call with cached version
setupPostsListener = setupPostsListenerWithCache;

// ======================
// 8. INIT
// ======================

window.addEventListener("DOMContentLoaded", async () => {
  // restore username from localStorage
  const stored = localStorage.getItem("tch_username");
  if (stored) {
    currentUser = stored;
    usernameInput.value = stored;
  }

  setUsernameBtn.addEventListener("click", setUsername);
  publishBtn.addEventListener("click", publishPost);
  promoteBtn.addEventListener("click", promoteUser);

  setupClanButtons();
  updateFeedTitle();

  await loadRoles();
  setupPostsListener();
});
