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
const OWNER_USERNAME = "Cloudstar";
const OWNER_PASSWORD = "Cloudstar7Wind";
const CONFIRMATION_CODE = "WCU";

const FIXED_POSTER_PASSWORDS = {
  Pinestar: "PineThunder",
  Grapestar: "GrapeShadow",
  Willowshine: "Willowshine7",
  Lakestar: "LakestarRiver"
};

let currentUser = null;
let currentRole = "visitor";
let currentClanFilter = "all";
let promotedUsers = [];
let posterPasswords = { ...FIXED_POSTER_PASSWORDS };
let lastSnapshotDocs = [];
let confirmationUnlocked = false;

// --- 4. DOM ELEMENTS ---
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

const confirmModal = document.getElementById("confirmModal");
const confirmCodeModalInput = document.getElementById("confirmCodeModalInput");
const confirmCodeBtn = document.getElementById("confirmCodeBtn");
const confirmMessage = document.getElementById("confirmMessage");

// --- 5. ROLE LOADING ---

async function loadRoles() {
  const snap = await getDoc(metaDocRef);

  if (!snap.exists()) {
    const initialPromoted = Object.keys(FIXED_POSTER_PASSWORDS);
    await setDoc(metaDocRef, { promoted: initialPromoted });
    promotedUsers = initialPromoted;
  } else {
    const data = snap.data();
    promotedUsers = data.promoted || Object.keys(FIXED_POSTER_PASSWORDS);
  }

  posterPasswords = { ...FIXED_POSTER_PASSWORDS };

  renderPromotedList();
  updateRoleFromUsername();
}

function renderPromotedList() {
  if (!promotedList) return;
  promotedList.innerHTML = "";

  promotedUsers.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = `${name} (poster)`;
    promotedList.appendChild(li);
  });
}

async function promoteUser() {
  if (!confirmationUnlocked) {
    alert("Enter the confirmation password in the popup first.");
    return;
  }

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

  if (!FIXED_POSTER_PASSWORDS[name]) {
    alert("That username does not have a fixed password in the code yet.");
    return;
  }

  promotedUsers.push(name);

  await setDoc(metaDocRef, { promoted: promotedUsers }, { merge: true });

  promoteInput.value = "";
  renderPromotedList();
  alert(`${name} was promoted as a poster.`);
}

function updateRoleFromUsername() {
  if (!currentUser) {
    currentRole = "visitor";
    applyRoleUI();
    return;
  }

  const pwd = passwordInput.value.trim();

  if (currentUser === OWNER_USERNAME) {
    if (pwd && pwd === OWNER_PASSWORD) {
      currentRole = "owner";
    } else {
      currentRole = "visitor";
      if (pwd !== "") alert("Wrong password for Cloudstar.");
    }
  } else if (promotedUsers.includes(currentUser)) {
    const expected = posterPasswords[currentUser];
    if (expected && pwd && pwd === expected) {
      currentRole = "poster";
    } else {
      currentRole = "visitor";
      if (pwd !== "") alert("Wrong password for poster account.");
    }
  } else {
    currentRole = "visitor";
  }

  applyRoleUI();
}

function applyRoleUI() {
  if (currentUserLabel) {
    currentUserLabel.textContent = currentUser
      ? `Logged in as: ${currentUser}`
      : "(no username set)";
  }

  if (!roleBadge || !posterControls || !ownerControls) return;

  if (!confirmationUnlocked) {
    roleBadge.textContent = "Visitor";
    roleBadge.style.background = "#4b5563";
    posterControls.style.display = "none";
    ownerControls.style.display = "none";
    return;
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

// --- 6. CONFIRM MODAL ---

function unlockConfirmation() {
  if (!confirmCodeModalInput || !confirmModal || !confirmMessage) return;

  const value = confirmCodeModalInput.value.trim();

  if (value === CONFIRMATION_CODE) {
    confirmationUnlocked = true;
    confirmModal.style.display = "none";
    confirmMessage.textContent = "";
    applyRoleUI();
  } else {
    confirmationUnlocked = false;
    confirmMessage.textContent = "Wrong confirmation password.";
  }
}

// --- 7. POSTS ---

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

  if (confirmationUnlocked && currentRole === "owner" && currentUser === "Cloudstar") {
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
      const ok = confirm(`Delete "${data.title || "(no title)"}" permanently?`);
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
  if (postsContainer) postsContainer.innerHTML = "";
}

function updateFeedTitle() {
  if (!feedTitle) return;

  feedTitle.textContent =
    currentClanFilter === "all"
      ? "All Clan News"
      : `${currentClanFilter} News`;
}

function renderFilteredPosts(allPosts) {
  clearPosts();
  if (!postsContainer) return;

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
    postsContainer.appendChild(renderPost(p));
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
  if (!confirmationUnlocked) {
    alert("Enter the confirmation password in the popup first.");
    return;
  }

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

// --- 8. LOGIN ---

function setUsernameAndRole() {
  if (!confirmationUnlocked) {
    alert("Enter the confirmation password in the popup first.");
    return;
  }

  const name = usernameInput.value.trim();
  const pwd = passwordInput.value.trim();

  if (!name) {
    alert("Please enter a username.");
    return;
  }

  if (!pwd) {
    alert("Please enter a password.");
    return;
  }

  currentUser = name;
  localStorage.setItem("tch_username", currentUser);
  updateRoleFromUsername();
}

// --- 9. CLAN BUTTONS ---

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

// --- 10. INIT ---

window.addEventListener("DOMContentLoaded", async () => {
  const stored = localStorage.getItem("tch_username");
  if (stored && usernameInput) {
    currentUser = stored;
    usernameInput.value = stored;
  }

  if (setUsernameBtn) setUsernameBtn.addEventListener("click", setUsernameAndRole);
  if (publishBtn) publishBtn.addEventListener("click", publishPost);
  if (promoteBtn) promoteBtn.addEventListener("click", promoteUser);
  if (confirmCodeBtn) confirmCodeBtn.addEventListener("click", unlockConfirmation);

  if (confirmCodeModalInput) {
    confirmCodeModalInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlockConfirmation();
    });
  }

  setupClanButtons();
  updateFeedTitle();

  await loadRoles();
  setupPostsListener();
});
