const API_URL = window.AUCTION_API_URL ?? "http://localhost:5000";
const SESSION_KEY = "livelot-session";
const FIXTURE_MARKER = /\btest fixture\b|automated api test fixture/i;

const state = {
  auctions: [],
  selectedAuction: null,
  session: readSession(),
  socket: null,
  accountMode: "login",
  bidPending: false,
  pendingSell: false,
  search: "",
  status: "ALL",
  requestVersion: 0,
  auctionSnapshotVersion: 0,
  historySnapshotVersion: 0,
  countdownTimer: null,
  listingImages: [],
  listingCoverId: null,
};

const el = (selector) => document.querySelector(selector);
const ui = {
  browseView: el("#browse-view"), detailView: el("#detail-view"), grid: el("#auction-grid"), listState: el("#auction-list-state"),
  detail: el("#auction-detail"), detailLoading: el("#detail-loading"), detailError: el("#detail-error"), detailErrorMessage: el("#detail-error-message"),
  title: el("#auction-title"), description: el("#auction-description"), status: el("#auction-status"), detailStatus: el("#detail-status-text"),
  startTime: el("#auction-start-time"), startingPrice: el("#starting-price"), price: el("#current-price"), remaining: el("#auction-time-remaining"),
  bidForm: el("#bid-form"), bidAmount: el("#bid-amount"), bidSubmit: el("#bid-submit"), bidHint: el("#bid-hint"),
  history: el("#bid-history"), historyState: el("#history-state"), notice: el("#notice"),
  accountAction: el("#account-action"), signoutAction: el("#signout-action"), sellAction: el("#sell-action"), accountDialog: el("#account-dialog"), accountForm: el("#account-form"),
  accountTitle: el("#account-title"), accountDescription: el("#account-description"), accountNameField: el("#name-field"), accountName: el("#account-name"),
  accountEmail: el("#account-email"), accountPassword: el("#account-password"), accountError: el("#account-error"), accountSubmit: el("#account-submit"),
  passwordHelp: el("#password-help"),
  accountSwitchCopy: el("#account-switch-copy"), accountSwitch: el("#account-switch"), sellDialog: el("#sell-dialog"), sellForm: el("#sell-form"), sellError: el("#sell-error"),
  sellSubmit: el("#sell-submit"),
  auctionImages: el("#auction-images"), coverIndexField: el("#cover-index-field"), coverIndex: el("#cover-index"), imagePreview: el("#image-preview"), imageSelection: el("#image-selection"), detailVisual: el("#detail-visual"),
  signupAction: el("#signup-action"), filterDrawer: el("#filter-drawer"), filterBackdrop: el("#filter-backdrop"), filterCurrent: el("#filter-current"),
  search: el("#auction-search"), clearSearch: el("#clear-search"), statusFilter: el("#status-filter"),
};

function readSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  state.session = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  renderHeader();
  renderBidControls();
}

function clearSession() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  renderHeader();
  renderBidControls();
  showNotice("Your session ended. Sign in again to bid.", true);
}

function showNotice(message, isError = false) {
  ui.notice.textContent = message;
  ui.notice.className = `notice${isError ? " notice--error" : ""}`;
  ui.notice.hidden = false;
}

function clearNotice() { ui.notice.hidden = true; }

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(options.headers ?? {}) },
    });
  } catch {
    throw new Error("Could not reach LiveLot. Check that the backend is running on port 5000.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function currency(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(number)
    : "—";
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function expired(auction) {
  const end = validDate(auction?.end_time);
  return Boolean(end && end.getTime() <= Date.now());
}

function effectiveStatus(auction) {
  if (!auction) return "—";
  if (auction.status !== "CANCELLED" && expired(auction)) return "ENDED";
  return auction.status;
}

function timeLabel(auction) {
  const status = effectiveStatus(auction);
  const start = validDate(auction.start_time);
  const end = validDate(auction.end_time);
  if (status === "CANCELLED") return "Sale cancelled";
  if (status === "ENDED") return end ? `Ended ${end.toLocaleDateString()}` : "Sale ended";
  if (status === "UPCOMING" && start && start > new Date()) return `Starts ${start.toLocaleDateString()}`;
  if (!end) return "End time not set";
  return `Ends ${end.toLocaleDateString()}`;
}

function renderHeader() {
  if (state.session) {
    ui.accountAction.textContent = state.session.user.name;
    ui.accountAction.title = `Signed in as ${state.session.user.email}`;
    ui.signupAction.hidden = true;
    ui.signoutAction.hidden = false;
  } else {
    ui.accountAction.textContent = "Sign in";
    ui.accountAction.removeAttribute("title");
    ui.signupAction.hidden = false;
    ui.signoutAction.hidden = true;
  }
}

function renderFilterLabel() {
  ui.filterCurrent.textContent = state.status === "ALL" ? "All lots" : state.status.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function setFilterDrawer(open) {
  ui.filterDrawer.classList.toggle("is-open", open);
  ui.filterDrawer.setAttribute("aria-hidden", String(!open));
  ui.filterDrawer.inert = !open;
  ui.filterBackdrop.hidden = !open;
  el("#filter-open").setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("drawer-open", open);
  if (open) el("#filter-close").focus();
}

function renderArtwork(auction, detail = false) {
  if (detail) return;
  const card = document.createElement("div");
  card.className = "card-art";
  const cover = auction.coverImage ?? auction.images?.find((image) => image.is_cover) ?? auction.images?.[0];
  if (cover?.url) {
    const image = document.createElement("img");
    image.className = "card-art__photo";
    image.src = cover.url;
    image.alt = auction.title;
    image.loading = "lazy";
    card.append(image);
    return card;
  }
  const label = document.createElement("span");
  label.className = "card-art__label";
  label.textContent = "LIVELOT · AUCTION";
  const symbol = document.createElement("span");
  symbol.className = "card-art__symbol";
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = "L";
  const lot = document.createElement("span");
  lot.className = "card-art__lot";
  lot.textContent = `LOT · ${auction.status}`;
  card.append(label, symbol, lot);
  return card;
}

function visibleAuctions() {
  return state.auctions.filter((auction) => {
    const status = effectiveStatus(auction);
    const searchable = `${auction.title} ${auction.description ?? ""}`.toLowerCase();
    return !FIXTURE_MARKER.test(searchable)
      && (state.status === "ALL" || status === state.status)
      && (!state.search || searchable.includes(state.search));
  });
}

function renderAuctions() {
  const auctions = visibleAuctions();
  ui.grid.replaceChildren();
  ui.listState.hidden = auctions.length > 0;
  if (!auctions.length) {
    ui.listState.textContent = state.search || state.status !== "ALL"
      ? "No auctions match those filters. Try another search or status."
      : "No public auctions are available yet. Sign in to list the first one.";
    const empty = document.createElement("div");
    empty.className = "empty-results";
    empty.textContent = "The next remarkable find could be yours.";
    ui.grid.append(empty);
    return;
  }

  auctions.forEach((auction, index) => {
    const article = document.createElement("article");
    article.className = "auction-card";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "auction-card__open";
    open.setAttribute("aria-label", `View ${auction.title}, ${effectiveStatus(auction)}, current price ${currency(auction.current_price)}`);
    open.append(renderArtwork(auction));

    const content = document.createElement("div");
    content.className = "card-content";
    const topline = document.createElement("div");
    topline.className = "card-topline";
    const status = document.createElement("span");
    status.className = `card-status card-status--${effectiveStatus(auction).toLowerCase()}`;
    status.textContent = effectiveStatus(auction);
    const lot = document.createElement("span");
    lot.className = "card-status";
    lot.textContent = `LOT ${String(index + 1).padStart(2, "0")}`;
    topline.append(status, lot);
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = auction.title;
    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const priceWrap = document.createElement("div");
    const priceLabel = document.createElement("span");
    priceLabel.className = "card-price-label";
    priceLabel.textContent = "Current price";
    const price = document.createElement("strong");
    price.className = "card-price";
    price.textContent = currency(auction.current_price);
    priceWrap.append(priceLabel, price);
    const time = document.createElement("span");
    time.className = "card-time";
    time.textContent = timeLabel(auction);
    bottom.append(priceWrap, time);
    content.append(topline, title, bottom);
    open.append(content);
    open.addEventListener("click", () => openAuction(auction.id));
    article.append(open);
    ui.grid.append(article);
  });
}

function renderBidControls() {
  const auction = state.selectedAuction;
  const signedIn = Boolean(state.session?.token);
  const isSeller = signedIn && auction?.seller_id === state.session.user.id;
  const active = effectiveStatus(auction) === "ACTIVE";
  const enabled = Boolean(auction && signedIn && active && validDate(auction.end_time) && !isSeller && !state.bidPending);
  ui.bidAmount.disabled = !enabled;
  ui.bidSubmit.disabled = !enabled;
  if (!auction) ui.bidHint.textContent = "Select an auction to see bidding details.";
  else if (!signedIn) ui.bidHint.textContent = "Sign in to place a bid.";
  else if (isSeller) ui.bidHint.textContent = "Sellers cannot bid on their own auction.";
  else if (effectiveStatus(auction) === "UPCOMING") ui.bidHint.textContent = "Bidding opens when this auction starts.";
  else if (active && !validDate(auction.end_time)) ui.bidHint.textContent = "Bidding is unavailable because this auction has no end time.";
  else if (!active) ui.bidHint.textContent = effectiveStatus(auction) === "CANCELLED" ? "This auction was cancelled." : "Bidding has ended for this auction.";
  else ui.bidHint.textContent = `Minimum next bid: ${currency(Number(auction.current_price) + 0.01)}.`;
}

function setAuctionStatus(status) {
  ui.status.textContent = status;
  ui.status.className = `status-badge status-badge--${status.toLowerCase()}`;
  ui.detailStatus.textContent = status;
}

function renderDetail() {
  const auction = state.selectedAuction;
  if (!auction) return;
  const status = effectiveStatus(auction);
  ui.title.textContent = auction.title;
  ui.description.textContent = auction.description || "The seller has not added a description.";
  setAuctionStatus(status);
  ui.startTime.textContent = auction.start_time ? `Sale opened ${validDate(auction.start_time)?.toLocaleDateString() ?? ""}` : "";
  ui.startingPrice.textContent = currency(auction.starting_price);
  ui.price.textContent = currency(auction.current_price);
  renderDetailVisual(auction);
  updateCountdown();
  renderBidControls();
}

function renderDetailVisual(auction) {
  ui.detailVisual.replaceChildren();
  const images = Array.isArray(auction.images) ? auction.images : [];
  const cover = auction.coverImage ?? images.find((image) => image.is_cover) ?? images[0];
  if (!cover?.url) {
    ui.detailVisual.setAttribute("aria-label", "No product image provided for this auction");
    const label = document.createElement("div"); label.className = "art-label"; label.textContent = "LIVELOT · LOT No.";
    const symbol = document.createElement("div"); symbol.className = "lot-symbol lot-symbol--fallback"; symbol.textContent = "L";
    const note = document.createElement("div"); note.className = "art-note"; note.innerHTML = "<span>THE LIVELOT EDIT</span><span>Imagery not supplied</span>";
    ui.detailVisual.append(label, symbol, note); return;
  }
  ui.detailVisual.setAttribute("aria-label", `${images.length} image${images.length === 1 ? "" : "s"} for ${auction.title}`);
  const image = document.createElement("img"); image.className = "detail-photo"; image.src = cover.url; image.alt = auction.title;
  ui.detailVisual.append(image);
  if (images.length > 1) {
    const gallery = document.createElement("div"); gallery.className = "detail-gallery";
    images.forEach((item, index) => { const thumb = document.createElement("img"); thumb.src = item.url; thumb.alt = `${auction.title}, image ${index + 1}`; thumb.className = item.id === cover.id ? "is-cover" : ""; thumb.addEventListener("click", () => { image.src = item.url; gallery.querySelectorAll("img").forEach((node) => node.classList.remove("is-cover")); thumb.classList.add("is-cover"); }); gallery.append(thumb); });
    ui.detailVisual.append(gallery);
  }
}

function imageKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function resetListingImages() {
  state.listingImages = [];
  state.listingCoverId = null;
  ui.auctionImages.value = "";
  renderListingImages();
}

function renderListingImages() {
  const images = state.listingImages;
  if (!images.some((image) => image.id === state.listingCoverId)) state.listingCoverId = images[0]?.id ?? null;
  ui.coverIndex.replaceChildren(...images.map((image, index) => {
    const option = document.createElement("option");
    option.value = image.id;
    option.textContent = `${index + 1}. ${image.file.name}`;
    option.selected = image.id === state.listingCoverId;
    return option;
  }));
  ui.coverIndexField.hidden = images.length === 0;
  ui.imagePreview.textContent = images.length ? `${images.length} of 6 images selected.` : "";
  ui.imageSelection.replaceChildren(...images.map((image, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = `${index + 1}. ${image.file.name}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "image-remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      state.listingImages = state.listingImages.filter((candidate) => candidate.id !== image.id);
      renderListingImages();
    });
    item.append(name, remove);
    return item;
  }));
}

function updateCountdown() {
  const auction = state.selectedAuction;
  if (!auction) return;
  const status = effectiveStatus(auction);
  const start = validDate(auction.start_time);
  const end = validDate(auction.end_time);
  if (status === "CANCELLED") ui.remaining.textContent = "This auction has been cancelled.";
  else if (status === "ENDED") ui.remaining.textContent = end ? `Ended ${end.toLocaleString()}` : "This auction has ended.";
  else if (status === "UPCOMING" && start && start > new Date()) ui.remaining.textContent = `Opens ${start.toLocaleString()}`;
  else if (end) {
    const seconds = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    ui.remaining.textContent = `Time remaining · ${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
    if (seconds === 0) {
      setAuctionStatus("ENDED");
      renderBidControls();
    }
  } else ui.remaining.textContent = "End time not provided.";
}

async function loadAuctions() {
  ui.listState.hidden = false;
  ui.listState.textContent = "Loading the current selection…";
  try {
    const { auctions } = await api("/api/auctions");
    state.auctions = Array.isArray(auctions) ? auctions : [];
    renderAuctions();

    const selectedStillExists = state.selectedAuction && state.auctions.some((auction) => auction.id === state.selectedAuction.id);
    if (selectedStillExists) {
      const updated = state.auctions.find((auction) => auction.id === state.selectedAuction.id);
      state.selectedAuction = updated;
      renderDetail();
    }

    if (!state.selectedAuction) {
      const deepLink = new URLSearchParams(location.search).get("auction");
      const active = state.auctions.find((auction) => auction.status === "ACTIVE" && !expired(auction) && !FIXTURE_MARKER.test(`${auction.title} ${auction.description ?? ""}`));
      const candidate = deepLink ? state.auctions.find((auction) => auction.id === deepLink && !FIXTURE_MARKER.test(`${auction.title} ${auction.description ?? ""}`)) : active;
      if (candidate) await openAuction(candidate.id, false);
    }
  } catch (error) {
    ui.listState.textContent = error.message;
  }
}

async function openAuction(auctionId, updateUrl = true) {
  const requestId = ++state.requestVersion;
  state.selectedAuction = null;
  ui.browseView.hidden = true;
  ui.detailView.hidden = false;
  ui.detail.hidden = true;
  ui.detailError.hidden = true;
  ui.detailLoading.hidden = false;
  clearNotice();
  if (updateUrl) history.pushState({ auctionId }, "", `?auction=${encodeURIComponent(auctionId)}`);
  try {
    const { auction } = await api(`/api/auctions/${encodeURIComponent(auctionId)}`);
    if (requestId !== state.requestVersion) return;
    if (FIXTURE_MARKER.test(`${auction.title} ${auction.description ?? ""}`)) throw new Error("This is a test fixture and is hidden from marketplace browsing.");
    state.selectedAuction = auction;
    ui.detailLoading.hidden = true;
    ui.detail.hidden = false;
    renderDetail();
    joinAuctionRoom();
    await loadBidHistory(auction.id);
  } catch (error) {
    if (requestId !== state.requestVersion) return;
    ui.detailLoading.hidden = true;
    ui.detailError.hidden = false;
    ui.detailErrorMessage.textContent = error.message;
  }
}

async function refreshSelectedAuction(auctionId) {
  const snapshotVersion = ++state.auctionSnapshotVersion;
  try {
    const { auction } = await api(`/api/auctions/${encodeURIComponent(auctionId)}`);
    if (snapshotVersion !== state.auctionSnapshotVersion || state.selectedAuction?.id !== auctionId) return;
    state.selectedAuction = auction;
    renderDetail();
    renderAuctions();
  } catch (error) {
    if (error.status === 404) showNotice("This auction is no longer available.", true);
  }
}

async function loadBidHistory(auctionId = state.selectedAuction?.id) {
  if (!auctionId) return;
  const snapshotVersion = ++state.historySnapshotVersion;
  ui.historyState.hidden = false;
  ui.historyState.textContent = "Loading bid history…";
  ui.history.replaceChildren();
  try {
    const { bids } = await api(`/api/auctions/${encodeURIComponent(auctionId)}/bids`);
    if (snapshotVersion !== state.historySnapshotVersion || state.selectedAuction?.id !== auctionId) return;
    ui.historyState.hidden = bids.length > 0;
    ui.historyState.textContent = bids.length ? "" : "No bids have been placed yet.";
    bids.forEach((bid) => {
      const item = document.createElement("li");
      const marker = document.createElement("span");
      marker.className = "history-marker";
      marker.setAttribute("aria-hidden", "true");
      const amount = document.createElement("strong");
      amount.className = "history-amount";
      amount.textContent = currency(bid.amount);
      const time = document.createElement("time");
      time.className = "history-time";
      const date = validDate(bid.created_at);
      time.dateTime = date?.toISOString() ?? "";
      time.textContent = date?.toLocaleString() ?? "Time unavailable";
      item.append(marker, amount, time);
      ui.history.append(item);
    });
  } catch (error) {
    if (snapshotVersion === state.historySnapshotVersion && state.selectedAuction?.id === auctionId) {
      ui.historyState.textContent = `Could not load bid history: ${error.message}`;
    }
  }
}

async function submitBid(event) {
  event.preventDefault();
  const auction = state.selectedAuction;
  if (!auction || !state.session?.token || state.bidPending) return;
  const amount = ui.bidAmount.value.trim();
  if (!amount) return;

  state.bidPending = true;
  renderBidControls();
  clearNotice();
  try {
    const result = await api(`/api/auctions/${encodeURIComponent(auction.id)}/bids`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.session.token}` },
      body: JSON.stringify({ amount }),
    });
    ui.bidAmount.value = "";
    showNotice(result.result ?? result.message ?? "Bid accepted.");
    await Promise.all([refreshSelectedAuction(auction.id), loadBidHistory(auction.id)]);
  } catch (error) {
    if (error.status === 401) clearSession();
    showNotice(error.message, true);
    if (error.status === 409) await refreshSelectedAuction(auction.id);
  } finally {
    state.bidPending = false;
    renderBidControls();
  }
}

function openAccount(mode = "login") {
  state.accountMode = mode;
  renderAccountForm();
  ui.accountDialog.showModal();
}

function renderAccountForm() {
  const registering = state.accountMode === "register";
  ui.accountTitle.textContent = registering ? "Join the room." : "Welcome back.";
  ui.accountDescription.textContent = registering ? "Create an account to follow a sale and place bids." : "Sign in to follow a sale and place bids.";
  ui.accountNameField.hidden = !registering;
  ui.accountName.required = registering;
  ui.accountPassword.autocomplete = registering ? "new-password" : "current-password";
  ui.accountPassword.minLength = registering ? 8 : 1;
  ui.passwordHelp.hidden = !registering;
  ui.accountSubmit.textContent = registering ? "Create account" : "Sign in";
  ui.accountSwitchCopy.textContent = registering ? "Already a member?" : "New to LiveLot?";
  ui.accountSwitch.textContent = registering ? "Sign in" : "Create an account";
  ui.accountError.className = "form-error";
  ui.accountError.hidden = true;
}

async function submitAccount(event) {
  event.preventDefault();
  const registering = state.accountMode === "register";
  const form = new FormData(ui.accountForm);
  const payload = {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  };
  if (registering) payload.name = String(form.get("name") ?? "").trim();

  if (registering && !payload.name) {
    ui.accountError.hidden = false;
    ui.accountError.textContent = "Enter your name to create an account.";
    return;
  }

  ui.accountSubmit.disabled = true;
  ui.accountError.hidden = true;
  let registrationComplete = false;
  try {
    if (registering) {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
      registrationComplete = true;
    }

    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
    saveSession({ token: result.token, user: result.user });
    ui.accountDialog.close();
    ui.accountForm.reset();
    showNotice(registering ? "Your LiveLot account is ready. You’re signed in." : "Signed in. The server will verify each bid.");
    if (state.pendingSell) {
      state.pendingSell = false;
      ui.sellDialog.showModal();
    }
  } catch (error) {
    if (registering && registrationComplete) {
      // Registration may have succeeded even if the follow-up sign-in failed.
      state.accountMode = "login";
      renderAccountForm();
      ui.accountEmail.value = payload.email;
      ui.accountPassword.value = "";
      ui.accountError.hidden = false;
      ui.accountError.className = "form-error";
      ui.accountError.textContent = `Your account was created, but sign-in failed: ${error.message} Please sign in with your new credentials.`;
      return;
    }
    ui.accountError.hidden = false;
    ui.accountError.className = "form-error";
    ui.accountError.textContent = error.status === 401 && !registering
      ? "We couldn’t sign you in. Check the email and password, or create an account if you’re new."
      : error.message;
  } finally {
    ui.accountSubmit.disabled = false;
  }
}

async function submitAuction(event) {
  event.preventDefault();
  const token = state.session?.token;
  if (!token) return openAccount();
  const form = new FormData(ui.sellForm);
  const endTime = validDate(form.get("endTime"));
  if (!endTime || endTime <= new Date()) {
    ui.sellError.hidden = false;
    ui.sellError.textContent = "Choose an end time in the future.";
    return;
  }
  const payload = {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim() || null,
    startingPrice: Number(form.get("startingPrice")),
    endTime: endTime.toISOString(),
  };
  ui.sellError.hidden = true;
  ui.sellSubmit.disabled = true;
  try {
    const { auction } = await api("/api/auctions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    let imageNotice = "";
    const files = state.listingImages.map((image) => image.file);
    if (files.length) {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      const coverIndex = Math.max(0, state.listingImages.findIndex((image) => image.id === state.listingCoverId));
      formData.append("coverIndex", String(coverIndex));
      try {
        const imageResult = await api(`/api/auctions/${encodeURIComponent(auction.id)}/images`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        auction.images = imageResult.images;
        auction.coverImage = auction.images.find((image) => image.is_cover) ?? auction.images[0] ?? null;
      } catch (error) {
        imageNotice = `Auction created, but image upload failed: ${error.message}`;
        if (error.status === 401) clearSession();
      }
    }
    ui.sellDialog.close();
    ui.sellForm.reset();
    resetListingImages();
    state.auctions.unshift(auction);
    renderAuctions();
    showNotice(imageNotice || "Your auction is listed. It will become active at its start time.", Boolean(imageNotice));
    await openAuction(auction.id);
  } catch (error) {
    if (error.status === 401) clearSession();
    ui.sellError.hidden = false;
    ui.sellError.textContent = error.message;
  } finally {
    ui.sellSubmit.disabled = false;
  }
}

function joinAuctionRoom() {
  if (state.socket?.connected && state.selectedAuction?.id) state.socket.emit("auction:join", state.selectedAuction.id);
}

function connectSocket() {
  if (!window.io) return;
  state.socket = window.io(API_URL);
  state.socket.on("connect", () => {
    joinAuctionRoom();
  });
  state.socket.on("auction:error", (event) => showNotice(event.message ?? "Could not join this auction's live room.", true));
  state.socket.on("bid:accepted", (event) => {
    if (event.auctionId !== state.selectedAuction?.id) return;
    // The event has no sequence/version field, so reconcile against persisted REST state.
    showNotice(`A bid of ${currency(event.acceptedAmount)} was accepted.`);
    void Promise.all([refreshSelectedAuction(event.auctionId), loadBidHistory(event.auctionId)]);
  });
}

function backToBrowse(updateUrl = true) {
  state.requestVersion += 1;
  state.selectedAuction = null;
  ui.detailView.hidden = true;
  ui.browseView.hidden = false;
  if (updateUrl) history.pushState({}, "", location.pathname);
  renderAuctions();
}

async function shareAuction() {
  if (!state.selectedAuction) return;
  const link = new URL(location.href);
  link.searchParams.set("auction", state.selectedAuction.id);
  try {
    await navigator.clipboard.writeText(link.href);
    showNotice("Auction link copied.");
  } catch {
    showNotice(link.href);
  }
}

ui.accountAction.addEventListener("click", () => {
  if (state.session) {
    showNotice(`Signed in as ${state.session.user.email}.`);
  } else openAccount("login");
});
ui.signoutAction.addEventListener("click", () => {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  renderHeader();
  renderBidControls();
  showNotice("You have signed out.");
});
ui.signupAction.addEventListener("click", () => openAccount("register"));
ui.accountSwitch.addEventListener("click", () => {
  state.accountMode = state.accountMode === "login" ? "register" : "login";
  renderAccountForm();
});
ui.accountForm.addEventListener("submit", submitAccount);
ui.sellAction.addEventListener("click", () => {
  clearNotice();
  if (!state.session) {
    state.pendingSell = true;
    openAccount("login");
    return;
  }
  ui.sellDialog.showModal();
});
ui.sellForm.addEventListener("submit", submitAuction);
ui.auctionImages.addEventListener("change", () => {
  const chosen = Array.from(ui.auctionImages.files ?? []);
  const known = new Set(state.listingImages.map((image) => imageKey(image.file)));
  const additions = chosen.filter((file) => !known.has(imageKey(file)));
  const remaining = 6 - state.listingImages.length;
  state.listingImages.push(...additions.slice(0, Math.max(0, remaining)).map((file) => ({ id: crypto.randomUUID(), file })));
  ui.auctionImages.value = "";
  renderListingImages();
});
ui.coverIndex.addEventListener("change", () => { state.listingCoverId = ui.coverIndex.value || null; renderListingImages(); });
ui.bidForm.addEventListener("submit", submitBid);
el("#back-to-browse").addEventListener("click", () => backToBrowse());
el("#error-back").addEventListener("click", () => backToBrowse());
el("#refresh-history").addEventListener("click", () => loadBidHistory());
el("#share-auction").addEventListener("click", shareAuction);
el("#search-form").addEventListener("submit", (event) => event.preventDefault());
ui.search.addEventListener("input", () => {
  state.search = ui.search.value.trim().toLowerCase();
  ui.clearSearch.hidden = !ui.search.value;
  renderAuctions();
});
ui.clearSearch.addEventListener("click", () => {
  ui.search.value = "";
  state.search = "";
  ui.clearSearch.hidden = true;
  ui.search.focus();
  renderAuctions();
});
ui.statusFilter.addEventListener("change", () => {
  state.status = ui.statusFilter.value;
  renderFilterLabel();
  renderAuctions();
});
el("#browse-link").addEventListener("click", (event) => {
  event.preventDefault();
  backToBrowse();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
el("#auctions-link").addEventListener("click", (event) => {
  event.preventDefault();
  backToBrowse();
  requestAnimationFrame(() => el("#auction-section").scrollIntoView({ behavior: "smooth", block: "start" }));
});
el("#filter-open").addEventListener("click", () => setFilterDrawer(true));
el("#filter-close").addEventListener("click", () => setFilterDrawer(false));
el("#filter-apply").addEventListener("click", () => setFilterDrawer(false));
ui.filterBackdrop.addEventListener("click", () => setFilterDrawer(false));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ui.filterDrawer.classList.contains("is-open")) setFilterDrawer(false);
});
let scrollFrame = 0;
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = window.scrollY / maxScroll;
    document.documentElement.style.setProperty("--scroll-x", `${progress * 22}%`);
    document.documentElement.style.setProperty("--scroll-y", `${progress * 38}%`);
    document.documentElement.style.setProperty("--scroll-x-reverse", `${progress * -24}%`);
    document.documentElement.style.setProperty("--scroll-y-reverse", `${progress * -30}%`);
    document.documentElement.style.setProperty("--scroll-offset", `${progress * -2.5}rem`);
    scrollFrame = 0;
  });
}, { passive: true });
el(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  backToBrowse();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
el('.main-nav a[href="#how-it-works"]').addEventListener("click", (event) => {
  event.preventDefault();
  backToBrowse();
  requestAnimationFrame(() => el("#how-it-works").scrollIntoView({ behavior: "smooth", block: "start" }));
});
window.addEventListener("popstate", () => {
  const auctionId = new URLSearchParams(location.search).get("auction");
  if (auctionId) void openAuction(auctionId, false);
  else backToBrowse(false);
});

renderHeader();
renderFilterLabel();
renderBidControls();
connectSocket();
state.countdownTimer = window.setInterval(updateCountdown, 1000);
void loadAuctions();
