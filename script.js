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
const commentsCol = collection(db, "comments");
const metaDocRef = doc(db, "meta", "roles");
const usersCol = collection(db, "users");

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
let allComments = [];
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

// --- 5. HELPERS ---

function isReservedUsername(name) {
  if (!name) return false;
  if (name === OWNER_USERNAME) return true;
  return Object.prototype.hasOwnProperty.call(FIXED_POSTER_PASSWORDS, name);
}

function normalizeUsername(name) {
  return name.trim();
}

function getUserDocRef(username) {
  return doc(db, "users", username);
}

// --- 6. ROLE LOADING ---

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
  applyRoleUI();
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
  updateRoleFromUsername();
  alert(`${name} was promoted as a poster.`);
}

function updateRoleFromUsername() {
  if (!currentUser) {
    currentRole = "visitor";
    applyRoleUI();
    renderFilteredPosts(lastSnapshotDocs);
    return;
  }

  if (currentUser === OWNER_USERNAME) {
    currentRole = "owner";
  } else if (promotedUsers.includes(currentUser)) {
    currentRole = "poster";
  } else {
    currentRole = "member";
  }

  applyRoleUI();
  renderFilteredPosts(lastSnapshotDocs);
}

function applyRoleUI() {
  if (currentUserLabel) {
    currentUserLabel.textContent = currentUser
      ? `Logged in as: ${currentUser}`
      : "(not logged in)";
  }

  if (!roleBadge || !posterControls || !ownerControls) return;

  if (!confirmationUnlocked) {
    roleBadge.textContent = "Locked";
    roleBadge.style.background = "#4b5563";
    posterControls.style.display = "none";
    ownerControls.style.display = "none";
    return;
  }

  if (!currentUser) {
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
    roleBadge.textContent = "Member";
    roleBadge.style.background = "#3b82f6";
    posterControls.style.display = "none";
    ownerControls.style.display = "none";
  }
}

// --- 7. CONFIRM MODAL ---

function unlockConfirmation() {
  if (!confirmCodeModalInput || !confirmModal || !confirmMessage) return;

  const value = confirmCodeModalInput.value.trim();

  if (value === CONFIRMATION_CODE) {
    confirmationUnlocked = true;
    confirmModal.style.display = "none";
    confirmMessage.textContent = "";
    applyRoleUI();
    renderFilteredPosts(lastSnapshotDocs);
  } else {
    confirmationUnlocked = false;
    confirmMessage.textContent = "Wrong confirmation password.";
  }
}

// --- 8. ACCOUNT / LOGIN SYSTEM ---

async function setUsernameAndRole() {
  if (!confirmationUnlocked) {
    alert("Enter the confirmation password in the popup first.");
    return;
  }

  const rawName = usernameInput.value.trim();
  const name = normalizeUsername(rawName);
  const pwd = passwordInput.value.trim();

  if (!name) {
    alert("Please enter a username.");
    return;
  }

  if (!pwd) {
    alert("Please enter a password.");
    return;
  }

  if (name.includes("/")) {
    alert("Username cannot include /");
    return;
  }

  // OWNER LOGIN
  if (name === OWNER_USERNAME) {
    if (pwd !== OWNER_PASSWORD) {
      alert("Wrong password for Cloudstar.");
      return;
    }

    currentUser = name;
    localStorage.setItem("tch_username", currentUser);
    updateRoleFromUsername();
    return;
  }

  // FIXED PROMOTED USER LOGIN
  if (Object.prototype.hasOwnProperty.call(FIXED_POSTER_PASSWORDS, name)) {
    if (pwd !== FIXED_POSTER_PASSWORDS[name]) {
      alert("Wrong password for poster account.");
      return;
    }

    currentUser = name;
    localStorage.setItem("tch_username", currentUser);
    updateRoleFromUsername();
    return;
  }

  // NORMAL USER LOGIN / REGISTRATION
  const userRef = getUserDocRef(name);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: name,
      password: pwd,
      createdAt: new Date()
    });

    currentUser = name;
    localStorage.setItem("tch_username", currentUser);
    updateRoleFromUsername();
    alert(`Username "${name}" has been claimed and registered.`);
    return;
  }

  const data = snap.data();

  if (data.password !== pwd) {
    alert("That username is already taken, and the password is incorrect.");
    return;
  }

  currentUser = name;
  localStorage.setItem("tch_username", currentUser);
  updateRoleFromUsername();
}

// --- 9. COMMENTS ---

function getCommentsForPost(postId) {
  return allComments
    .filter((comment) => comment.data.postId === postId)
    .sort((a, b) => {
      const aTime = a.data.createdAt?.toDate
        ? a.data.createdAt.toDate().getTime()
        : new Date(a.data.createdAt || 0).getTime();

      const bTime = b.data.createdAt?.toDate
        ? b.data.createdAt.toDate().getTime()
        : new Date(b.data.createdAt || 0).getTime();

      return aTime - bTime;
    });
}

async function addComment(postId, inputEl) {
  if (!confirmationUnlocked) {
    alert("Enter the confirmation password in the popup first.");
    return;
  }

  if (!currentUser) {
    alert("You must log in first to comment.");
    return;
  }

  const text = inputEl.value.trim();
  if (!text) {
    alert("Comment cannot be empty.");
    return;
  }

  await addDoc(commentsCol, {
    postId,
    author: currentUser,
    body: text,
    createdAt: new Date()
  });

  inputEl.value = "";
}

async function deleteComment(commentId) {
  if (!(confirmationUnlocked && currentRole === "owner" && currentUser === "Cloudstar")) {
    alert("Only Cloudstar can delete comments.");
    return;
  }

  const ok = confirm("Delete this comment permanently?");
  if (!ok) return;

  await deleteDoc(doc(db, "comments", commentId));
}

function renderCommentsSection(postId) {
  const section = document.createElement("div");
  section.className = "comments-section";

  const heading = document.createElement("div");
  heading.className = "comments-heading";
  heading.textContent = "Comments";

  const list = document.createElement("div");
  list.className = "comments-list";

  const comments = getCommentsForPost(postId);

  if (comments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "comments-empty";
    empty.textContent = "No comments yet.";
    list.appendChild(empty);
  } else {
    comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment-item";

      const meta = document.createElement("div");
      meta.className = "comment-meta";

      const author = document.createElement("span");
      author.textContent = comment.data.author || "Unknown";

      const time = document.createElement("span");
      const date = comment.data.createdAt?.toDate
        ? comment.data.createdAt.toDate()
        : new Date(comment.data.createdAt || Date.now());
      time.textContent = " · " + date.toLocaleString();

      meta.appendChild(author);
      meta.appendChild(time);

      if (confirmationUnlocked && currentRole === "owner" && currentUser === "Cloudstar") {
        const delBtn = document.createElement("button");
        delBtn.className = "comment-delete-btn";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => deleteComment(comment.id));
        meta.appendChild(delBtn);
      }

      const body = document.createElement("div");
      body.className = "comment-body";
      body.textContent = comment.data.body;

      item.appendChild(meta);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  const form = document.createElement("div");
  form.className = "comment-form";

  const input = document.createElement("textarea");
  input.className = "comment-input";
  input.rows = 2;
  input.placeholder = currentUser
    ? "Write a comment..."
    : "Log in to write a comment";

  const btn = document.createElement("button");
  btn.className = "comment-btn";
  btn.textContent = "Comment";

  if (!confirmationUnlocked || !currentUser) {
    input.disabled = true;
    btn.disabled = true;
  }

  btn.addEventListener("click", () => addComment(postId, input));

  form.appendChild(input);
  form.appendChild(btn);

  section.appendChild(heading);
  section.appendChild(list);
  section.appendChild(form);

  return section;
}

// --- 10. POSTS ---

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
  wrapper.appendChild(renderCommentsSection(id));

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

function setupCommentsListener() {
  const q = query(commentsCol, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    allComments = [];
    snapshot.forEach((docSnap) => {
      allComments.push({
        id: docSnap.id,
        data: docSnap.data()
      });
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

  if (!(currentRole === "owner" || currentRole === "poster")) {
    alert("Only promoted users can post.");
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

// --- 11. INIT ---

window.addEventListener("DOMContentLoaded", async () => {
  const stored = localStorage.getItem("tch_username");
  if (stored && usernameInput) {
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
  setupCommentsListener();
});

// --- 12. CLAN BUTTONS ---
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
