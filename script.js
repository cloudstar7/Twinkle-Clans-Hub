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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAj04SX2YrStdZFWXkMowRxwBYM7xO2mSg",
  authDomain: "twinkle-clans-hub.firebaseapp.com",
  projectId: "twinkle-clans-hub",
  storageBucket: "twinkle-clans-hub.firebasestorage.app",
  messagingSenderId: "443187160032",
  appId: "1:443187160032:web:e6408e6043b7a607a60185"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postsCol = collection(db, "clanPosts");
const metaDocRef = doc(db, "meta", "roles");

// 2. STATE
const OWNER_USERNAME = "Cloudstar";
const postsCol = collection(db, "clanPosts");
const metaDocRef = doc(db, "meta", "roles");

// 2. STATE
const OWNER_USERNAME = "Cloudstar";

// FIXED PASSWORDS
const OWNER_PASSWORD = "Cloudstar7Wind";
const FIXED_POSTER_PASSWORDS = {
  "Pinestar(0)": "PineThunder",
  "Grapestar(1)": "GrapeShadow",
  "Willowshine(2)": "Willowshine7",
  "Lakestar(3)": "LakestarRiver"
};

let currentUser = null;
let currentRole = "visitor";
let currentClanFilter = "all";
let promotedUsers = [];
let posterPasswords = { ...FIXED_POSTER_PASSWORDS }; // start with fixed ones
let ownerPassword = OWNER_PASSWORD; // keep for compatibility
let lastSnapshotDocs = [];

// 3. DOM
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
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

// 4. ROLES & PASSWORDS
async function loadRoles() {
  const snap = await getDoc(metaDocRef);
  if (!snap.exists()) {
    // First time: create promoted list for your fixed posters only
    const initialPromoted = Object.keys(FIXED_POSTER_PASSWORDS);
    await setDoc(metaDocRef, {
      promoted: initialPromoted
    });
    promotedUsers = initialPromoted;
  } else {
    const data = snap.data();
    promotedUsers = data.promoted || Object.keys(FIXED_POSTER_PASSWORDS);
  }

  // Always enforce our fixed passwords in code
  posterPasswords = { ...FIXED_POSTER_PASSWORDS };
  ownerPassword = OWNER_PASSWORD;

  renderPromotedList();
  updateRoleFromUsername();
}

function renderPromotedList() {
  promotedList.innerHTML = "";
  promotedUsers.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name + " (poster)";
    promotedList.appendChild(li);
  });
}

// Only owner can call this from the UI
async function promoteUser() {
  if (currentRole !== "owner") {
    alert("Only Cloudstar (owner) can promote posters.");
    return;
  }

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

  // Ask Cloudstar to set a password for this poster
  const pwd = prompt(
    `Set a password for ${name}.\n` +
    "Tell this password only to that user so they can log in as a poster."
  );
  if (!pwd) {
    alert("Promotion cancelled (no password set).");
    return;
  }

  promotedUsers.push(name);
  posterPasswords[name] = pwd;

  await setDoc(
    metaDocRef,
    {
      promoted: promotedUsers,
      posterPasswords: posterPasswords
    },
    { merge: true }
  );

  promoteInput.value = "";
  renderPromotedList();
  alert(`Promoted ${name} as a poster. Password saved (but not shown again).`);
}

// Check username + password and set currentRole
function updateRoleFromUsername() {
  if (!currentUser) {
    currentRole = "visitor";
    applyRoleUI();
    return;
  }

  const pwd = passwordInput.value.trim();

  // Owner check
  if (currentUser === OWNER_USERNAME) {
    if (pwd && pwd === OWNER_PASSWORD) {
      currentRole = "owner";
    } else {
      currentRole = "visitor";
      if (pwd !== "") {
        alert("Wrong password for Cloudstar.");
      }
    }
  }
  // Poster check
  else if (promotedUsers.includes(currentUser)) {
    const expected = posterPasswords[currentUser];
    if (expected && pwd && pwd === expected) {
      currentRole = "poster";
    } else {
      currentRole = "visitor";
      if (pwd !== "") {
        alert("Wrong password for poster account.");
      }
    }
  }
  // Visitor
  else {
    currentRole = "visitor";
  }

  applyRoleUI();
}

function applyRoleUI() {
  currentUserLabel.textContent = currentUser
    ? `Logged in as: ${currentUser}`
    : "(no username set)";

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

// 5. POSTS (with delete buttons)
function renderPost(docObj) {
  const docSnap = docObj.docSnap;
  const data = docSnap.data();
  const id = docObj.id;

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

  // Delete button for owner or the original author (if poster)
  if (currentRole === "owner" || (currentRole === "poster" && currentUser === data.author)) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.marginLeft = "0.5rem";
    delBtn.style.fontSize = "0.7rem";
    delBtn.style.padding = "0.1rem 0.3rem";
    delBtn.style.borderRadius = "4px";
    delBtn.style.border = "none";
    delBtn.style.cursor = "pointer";
    delBtn.style.background = "#ef4444";
    delBtn.style.color = "#fee2e2";

    delBtn.addEventListener("click", async () => {
      const ok = confirm("Delete this post?");
      if (!ok) return;
      await deleteDoc(doc(db, "clanPosts", id));
    });

    metaEl.appendChild(delBtn);
  }

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
  feedTitle.textContent =
    currentClanFilter === "all"
      ? "All Clan News"
      : currentClanFilter + " News";
}

function renderFilteredPosts(allPosts) {
  clearPosts();
  const filtered = allPosts.filter((p) => {
    if (currentClanFilter === "all") return true;
    return p.docSnap.data().clan === currentClanFilter;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No posts yet for this filter.";
    empty.style.color = "#9ca3af";
    postsContainer.appendChild(empty);
    return;
  }

  filtered.forEach((p) => {
    const postEl = renderPost(p);
    postsContainer.appendChild(postEl);
  });
}

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

async function publishPost() {
  if (!currentUser) {
    alert("Set a username + password first.");
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

  await addDoc(postsCol, {
    clan,
    title: title || "(no title)",
    body,
    author: currentUser,
    createdAt: new Date()
  });

  postTitleInput.value = "";
  postBodyInput.value = "";
}

// 6. USERNAME + PASSWORD LOGIN
// 6. USERNAME + PASSWORD LOGIN
function setUsernameAndRole() {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Please enter a username.");
    return;
  }
  if (!passwordInput.value.trim()) {
    alert("Please enter a password.");
    return;
  }

  currentUser = name;
  // We save only username locally, not password
  localStorage.setItem("tch_username", currentUser);
  updateRoleFromUsername();
}
// 7. CLAN BUTTONS
function setupClanButtons() {
  clanButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clanButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentClanFilter = btn.dataset.clan;
      updateFeedTitle();
      renderFilteredPosts(lastSnapshotDocs);
    });
  });
}

// 8. INIT
window.addEventListener("DOMContentLoaded", async () => {
  const stored = localStorage.getItem("tch_username");
  if (stored) {
    currentUser = stored;
    usernameInput.value = stored;
  }

  setUsernameBtn.addEventListener("click", setUsernameAndRole);
  publishBtn.addEventListener("click", publishPost);
  promoteBtn.addEventListener("click", promoteUser);

  setupClanButtons();
  updateFeedTitle();

  await loadRoles();
  setupPostsListener();
});
