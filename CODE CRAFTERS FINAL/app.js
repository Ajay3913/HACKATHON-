// Core front-end logic for MedicChain Logistics prototype.

(function () {
  "use strict";

  const ledger = new window.MedicChainLedger();

  let shipments = [];
  let providers = [];
  let bids = [];

  function loadState() {
    try {
      shipments = JSON.parse(localStorage.getItem("mc_shipments") || "[]");
      providers = JSON.parse(localStorage.getItem("mc_providers") || "[]");
      bids = JSON.parse(localStorage.getItem("mc_bids") || "[]");
    } catch {
      shipments = [];
      providers = [];
      bids = [];
    }
  }

  function saveState() {
    localStorage.setItem("mc_shipments", JSON.stringify(shipments));
    localStorage.setItem("mc_providers", JSON.stringify(providers));
    localStorage.setItem("mc_bids", JSON.stringify(bids));
  }

  function generateId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }

  function getRole() {
    const select = document.getElementById("roleSelect");
    return select ? select.value : "manufacturer";
  }

  function alertRoleRestriction(message) {
    window.alert(message);
  }

  function routeByRoleAllowed(action) {
    const role = getRole();
    const map = {
      create_shipment: ["manufacturer", "distribution_center", "hospital", "lab"],
      edit_shipment: ["manufacturer", "distribution_center", "hospital", "lab"],
      delete_shipment: ["admin"],
      open_for_bids: ["distribution_center", "admin"],
      create_provider: ["transport_provider", "admin"],
      edit_provider: ["transport_provider", "admin"],
      delete_provider: ["admin"],
      submit_bid: ["transport_provider"],
      accept_bid: ["manufacturer", "distribution_center", "hospital", "admin"],
      update_status_transit: ["transport_provider"],
      confirm_delivery: ["hospital", "lab"],
    };
    const allowed = map[action] || [];
    return allowed.includes(role);
  }

  function requireRole(action, friendlyLabel) {
    if (!routeByRoleAllowed(action)) {
      alertRoleRestriction(
        `${friendlyLabel} is not allowed for the currently selected role.`
      );
      return false;
    }
    return true;
  }

  function renderDashboard() {
    const activeShipments = shipments.filter(
      (s) => s.status === "open_for_bids" || s.status === "in_transit"
    ).length;
    document.getElementById("statActiveShipments").textContent = activeShipments;

    document.getElementById("statEvents").textContent = ledger.chain.length;

    if (providers.length === 0) {
      document.getElementById("statReliability").textContent = "—";
    } else {
      const avg =
        providers.reduce((sum, p) => sum + (Number(p.reliability) || 0), 0) /
        providers.length;
      document.getElementById("statReliability").textContent = `${avg
        .toFixed(1)
        .replace(/\.0$/, "")}/100`;
    }

    const telemetryTimeline = document.getElementById("telemetryTimeline");
    telemetryTimeline.innerHTML = "";
    const sampleTelemetry = [
      {
        label: "Vaccine consignment VC-204",
        meta: "Temp 4.1°C • Stable • GPS synced",
      },
      {
        label: "Blood samples – BS-98",
        meta: "Temp 5.0°C • Route on schedule",
      },
      {
        label: "Diagnostic kits – DK-554",
        meta: "Temp 22.3°C • Within range",
      },
    ];
    sampleTelemetry.forEach((item) => {
      const div = document.createElement("div");
      div.className = "timeline-item";
      div.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-title">${item.label}</div>
        <div class="timeline-meta">${item.meta}</div>
      `;
      telemetryTimeline.appendChild(div);
    });

    const recentEvents = document.getElementById("recentEvents");
    recentEvents.innerHTML = "";
    const recentBlocks = ledger.chain.slice(-6).reverse();
    recentBlocks.forEach((block) => {
      const div = document.createElement("div");
      div.className = "event-item";
      const timestamp = new Date(block.timestamp).toLocaleString();
      div.innerHTML = `
        <div class="event-item-main">
          <span class="event-item-type">${block.type}</span>
          <span class="event-item-time">${timestamp}</span>
        </div>
        <div class="event-item-desc">${block.payload && block.payload.summary ? block.payload.summary : "On-chain logistics event"}</div>
      `;
      recentEvents.appendChild(div);
    });
  }

  function upsertShipment(e) {
    e.preventDefault();
    if (!requireRole("create_shipment", "Creating or updating shipments")) return;

    const form = document.getElementById("shipmentForm");
    const idField = document.getElementById("shipmentId");
    const id = idField.value || generateId("shp");
    const shipment = {
      id,
      title: document.getElementById("shipmentTitle").value.trim(),
      cargoType: document.getElementById("shipmentCargoType").value,
      from: document.getElementById("shipmentFrom").value.trim(),
      to: document.getElementById("shipmentTo").value.trim(),
      storage: document.getElementById("shipmentStorage").value.trim(),
      deadline: document.getElementById("shipmentDeadline").value,
      notes: document.getElementById("shipmentNotes").value.trim(),
      status: "draft",
      providerId: null,
    };

    const existingIndex = shipments.findIndex((s) => s.id === id);
    const isUpdate = existingIndex !== -1;
    if (isUpdate) {
      shipments[existingIndex] = { ...shipments[existingIndex], ...shipment };
    } else {
      shipments.push(shipment);
    }
    saveState();

    ledger.addBlock(isUpdate ? "SHIPMENT_UPDATED" : "SHIPMENT_CREATED", {
      shipmentId: shipment.id,
      title: shipment.title,
      summary: `${isUpdate ? "Updated" : "Created"} shipment "${shipment.title}"`,
    });

    form.reset();
    idField.value = "";
    renderAll();
  }

  function resetShipmentForm() {
    const form = document.getElementById("shipmentForm");
    form.reset();
    document.getElementById("shipmentId").value = "";
  }

  function renderShipmentTable() {
    const tbody = document.getElementById("shipmentTableBody");
    const filter = document.getElementById("shipmentFilterStatus").value;
    tbody.innerHTML = "";
    shipments
      .filter((s) => (filter === "all" ? true : s.status === filter))
      .forEach((s, idx) => {
        const tr = document.createElement("tr");
        const provider = providers.find((p) => p.id === s.providerId);
        const statusBadgeClass =
          s.status === "draft"
            ? "status-draft"
            : s.status === "open_for_bids"
            ? "status-open"
            : s.status === "in_transit"
            ? "status-transit"
            : "status-delivered";

        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${s.title}</td>
          <td>${s.cargoType}</td>
          <td>${s.from} → ${s.to}</td>
          <td><span class="badge ${statusBadgeClass}">${s.status.replace(/_/g, " ")}</span></td>
          <td>${provider ? provider.name : "—"}</td>
          <td>${formatDateTime(s.deadline)}</td>
          <td>
            <div class="pill-actions">
              <button class="pill-button" data-action="edit" data-id="${s.id}">Edit</button>
              <button class="pill-button" data-action="openBids" data-id="${s.id}">Open for Bids</button>
              <button class="pill-button" data-action="markTransit" data-id="${s.id}">Mark In Transit</button>
              <button class="pill-button" data-action="markDelivered" data-id="${s.id}">Mark Delivered</button>
              <button class="pill-button danger" data-action="delete" data-id="${s.id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const shipment = shipments.find((s) => s.id === id);
      if (!shipment) return;

      if (action === "edit") {
        if (!requireRole("edit_shipment", "Editing shipments")) return;
        document.getElementById("shipmentId").value = shipment.id;
        document.getElementById("shipmentTitle").value = shipment.title;
        document.getElementById("shipmentCargoType").value = shipment.cargoType;
        document.getElementById("shipmentFrom").value = shipment.from;
        document.getElementById("shipmentTo").value = shipment.to;
        document.getElementById("shipmentStorage").value = shipment.storage;
        document.getElementById("shipmentDeadline").value = shipment.deadline;
        document.getElementById("shipmentNotes").value = shipment.notes || "";
      } else if (action === "delete") {
        if (!requireRole("delete_shipment", "Deleting shipments")) return;
        if (!window.confirm("Delete this shipment? This will also remove related bids.")) {
          return;
        }
        shipments = shipments.filter((s) => s.id !== id);
        bids = bids.filter((b) => b.shipmentId !== id);
        saveState();
        ledger.addBlock("SHIPMENT_DELETED", {
          shipmentId: id,
          summary: `Shipment deleted`,
        });
        renderAll();
      } else if (action === "openBids") {
        if (!requireRole("open_for_bids", "Opening shipments for bidding")) return;
        shipment.status = "open_for_bids";
        saveState();
        ledger.addBlock("BIDDING_OPENED", {
          shipmentId: id,
          summary: `Shipment "${shipment.title}" opened for bids`,
        });
        document.querySelector('[data-section="bids"]').click();
        renderAll();
      } else if (action === "markTransit") {
        if (!requireRole("update_status_transit", "Marking shipments in transit")) return;
        shipment.status = "in_transit";
        saveState();
        ledger.addBlock("SHIPMENT_IN_TRANSIT", {
          shipmentId: id,
          summary: `Shipment "${shipment.title}" is now in transit`,
        });
        renderAll();
      } else if (action === "markDelivered") {
        if (!requireRole("confirm_delivery", "Confirming delivery and proof-of-delivery")) {
          return;
        }
        shipment.status = "delivered";
        saveState();
        ledger.addBlock("SHIPMENT_DELIVERED", {
          shipmentId: id,
          summary: `Shipment "${shipment.title}" confirmed delivered`,
        });
        ledger.addBlock("PAYOUT_SETTLED", {
          shipmentId: id,
          summary: `Smart contract settled payment to provider`,
        });
        renderAll();
      }
    };
  }

  function upsertProvider(e) {
    e.preventDefault();
    if (!requireRole("create_provider", "Creating or updating providers")) return;

    const idField = document.getElementById("providerId");
    const id = idField.value || generateId("prov");
    const provider = {
      id,
      name: document.getElementById("providerName").value.trim(),
      vehicle: document.getElementById("providerVehicle").value.trim(),
      coverage: document.getElementById("providerCoverage").value.trim(),
      reliability: Number(document.getElementById("providerReliability").value) || 0,
      credentials: document.getElementById("providerCredentials").value.trim(),
    };

    const existingIndex = providers.findIndex((p) => p.id === id);
    const isUpdate = existingIndex !== -1;
    if (isUpdate) {
      providers[existingIndex] = { ...providers[existingIndex], ...provider };
    } else {
      providers.push(provider);
    }
    saveState();

    ledger.addBlock(isUpdate ? "PROVIDER_UPDATED" : "PROVIDER_REGISTERED", {
      providerId: provider.id,
      providerName: provider.name,
      summary: `${isUpdate ? "Updated" : "Registered"} provider "${provider.name}"`,
    });

    document.getElementById("providerForm").reset();
    idField.value = "";
    renderAll();
  }

  function resetProviderForm() {
    const form = document.getElementById("providerForm");
    form.reset();
    document.getElementById("providerId").value = "";
  }

  function renderProviderTable() {
    const tbody = document.getElementById("providerTableBody");
    tbody.innerHTML = "";
    providers.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${p.name}</td>
        <td>${p.vehicle}</td>
        <td>${p.coverage || "—"}</td>
        <td>${p.reliability}/100</td>
        <td>
          <div class="pill-actions">
            <button class="pill-button" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="pill-button danger" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const provider = providers.find((p) => p.id === id);
      if (!provider) return;

      if (action === "edit") {
        if (!requireRole("edit_provider", "Editing providers")) return;
        document.getElementById("providerId").value = provider.id;
        document.getElementById("providerName").value = provider.name;
        document.getElementById("providerVehicle").value = provider.vehicle;
        document.getElementById("providerCoverage").value = provider.coverage || "";
        document.getElementById("providerReliability").value = provider.reliability;
        document.getElementById("providerCredentials").value = provider.credentials || "";
      } else if (action === "delete") {
        if (!requireRole("delete_provider", "Deleting providers")) return;
        if (!window.confirm("Delete this provider?")) return;
        providers = providers.filter((p) => p.id !== id);
        bids = bids.filter((b) => b.providerId !== id);
        saveState();
        ledger.addBlock("PROVIDER_DELETED", {
          providerId: id,
          summary: `Provider deleted`,
        });
        renderAll();
      }
    };
  }

  function renderBiddingShipments() {
    const tbody = document.getElementById("biddingShipmentsBody");
    tbody.innerHTML = "";
    shipments
      .filter((s) => s.status === "open_for_bids")
      .forEach((s, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${s.title}</td>
          <td>${s.cargoType}</td>
          <td>${formatDateTime(s.deadline)}</td>
          <td>
            <button class="pill-button" data-action="selectShipment" data-id="${s.id}">
              View / Bid
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action='selectShipment']");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      document.getElementById("bidShipmentId").value = id;
      renderBidsForShipment(id);
    };
  }

  function renderBidProviderOptions() {
    const select = document.getElementById("bidProviderSelect");
    select.innerHTML = "";
    providers.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.reliability}/100)`;
      select.appendChild(opt);
    });
  }

  function upsertBid(e) {
    e.preventDefault();
    if (!requireRole("submit_bid", "Submitting bids")) return;

    if (!providers.length) {
      window.alert("No providers registered. Register a transport provider first.");
      return;
    }

    const shipmentId = document.getElementById("bidShipmentId").value;
    if (!shipmentId) {
      window.alert("Select a shipment from the 'Open for Bids' list first.");
      return;
    }

    const providerId = document.getElementById("bidProviderSelect").value;
    const price = Number(document.getElementById("bidPrice").value) || 0;
    const etaHours = Number(document.getElementById("bidEtaHours").value) || 0;
    const vehicleFeatures = document
      .getElementById("bidVehicleFeatures")
      .value.trim();
    const idField = document.getElementById("bidId");
    const id = idField.value || generateId("bid");

    const bid = {
      id,
      shipmentId,
      providerId,
      price,
      etaHours,
      vehicleFeatures,
      createdAt: new Date().toISOString(),
    };

    const existingIndex = bids.findIndex((b) => b.id === id);
    const isUpdate = existingIndex !== -1;
    if (isUpdate) {
      bids[existingIndex] = { ...bids[existingIndex], ...bid };
    } else {
      bids.push(bid);
    }
    saveState();

    const provider = providers.find((p) => p.id === providerId);
    ledger.addBlock(isUpdate ? "BID_UPDATED" : "BID_SUBMITTED", {
      bidId: id,
      shipmentId,
      providerId,
      summary: `${provider ? provider.name : "Provider"} ${
        isUpdate ? "updated" : "submitted"
      } a bid`,
    });

    document.getElementById("bidForm").reset();
    document.getElementById("bidShipmentId").value = shipmentId;
    idField.value = "";
    renderBidsForShipment(shipmentId);
  }

  function renderBidsForShipment(shipmentId) {
    const tbody = document.getElementById("bidsTableBody");
    tbody.innerHTML = "";
    const shipment = shipments.find((s) => s.id === shipmentId);
    const relatedBids = bids.filter((b) => b.shipmentId === shipmentId);
    relatedBids.forEach((b, idx) => {
      const provider = providers.find((p) => p.id === b.providerId);
      const reliability = provider ? provider.reliability : 0;
      const compositeScore = reliability * 0.6 + (72 - Math.min(72, b.etaHours)) * 0.2;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${provider ? provider.name : "—"}</td>
        <td>$${b.price.toFixed(0)}</td>
        <td>${b.etaHours} h</td>
        <td>${reliability}</td>
        <td>${compositeScore.toFixed(1)}</td>
        <td>
          <div class="pill-actions">
            <button class="pill-button" data-action="accept" data-id="${b.id}">Accept</button>
            <button class="pill-button" data-action="edit" data-id="${b.id}">Edit</button>
            <button class="pill-button danger" data-action="delete" data-id="${b.id}">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const bid = bids.find((b) => b.id === id);
      if (!bid) return;

      if (action === "accept") {
        if (!requireRole("accept_bid", "Accepting bids and dispatching")) return;
        const shipmentToUpdate = shipments.find((s) => s.id === bid.shipmentId);
        if (!shipmentToUpdate) return;
        shipmentToUpdate.providerId = bid.providerId;
        shipmentToUpdate.status = "in_transit";
        saveState();
        const provider = providers.find((p) => p.id === bid.providerId);
        ledger.addBlock("CONTRACT_ACCEPTED", {
          shipmentId: bid.shipmentId,
          bidId: bid.id,
          providerId: bid.providerId,
          summary: `Smart contract accepted with ${
            provider ? provider.name : "provider"
          } for "${shipmentToUpdate.title}"`,
        });
        ledger.addBlock("DRIVER_DISPATCHED", {
          shipmentId: bid.shipmentId,
          summary: "Driver dispatched to pickup location",
        });
        document.querySelector('[data-section="shipments"]').click();
        renderAll();
      } else if (action === "edit") {
        document.getElementById("bidId").value = bid.id;
        document.getElementById("bidShipmentId").value = bid.shipmentId;
        document.getElementById("bidProviderSelect").value = bid.providerId;
        document.getElementById("bidPrice").value = bid.price;
        document.getElementById("bidEtaHours").value = bid.etaHours;
        document.getElementById("bidVehicleFeatures").value = bid.vehicleFeatures;
      } else if (action === "delete") {
        if (!window.confirm("Delete this bid?")) return;
        const shipmentIdLocal = bid.shipmentId;
        bids = bids.filter((b) => b.id !== id);
        saveState();
        ledger.addBlock("BID_DELETED", {
          bidId: id,
          summary: "Bid deleted",
        });
        renderBidsForShipment(shipmentIdLocal);
      }
    };

    const timeline = document.getElementById("lifecycleTimeline");
    timeline.innerHTML = "";
    if (!shipment) {
      timeline.innerHTML =
        '<div class="timeline-item"><div class="timeline-title">Select a shipment to see lifecycle events.</div></div>';
      return;
    }
    ledger.chain
      .filter((b) => b.payload && b.payload.shipmentId === shipmentId)
      .forEach((block) => {
        const div = document.createElement("div");
        div.className = "timeline-item";
        div.innerHTML = `
          <div class="timeline-dot"></div>
          <div class="timeline-title">${block.type}</div>
          <div class="timeline-meta">${new Date(
            block.timestamp
          ).toLocaleString()} • ${block.payload.summary || ""}</div>
        `;
        timeline.appendChild(div);
      });
  }

  function renderBlockchain() {
    const blockList = document.getElementById("blockList");
    const blockDetails = document.getElementById("blockDetails");
    blockList.innerHTML = "";

    ledger.chain.forEach((b) => {
      const div = document.createElement("div");
      div.className = "block-card";
      div.innerHTML = `
        <div class="block-card-index">Block #${b.index}</div>
        <div class="block-card-type">${b.type}</div>
        <div class="block-card-hash">Hash: ${b.hash}</div>
        <div class="block-card-hash">Prev: ${b.previousHash}</div>
      `;
      div.onclick = () => {
        blockDetails.textContent = JSON.stringify(b, null, 2);
      };
      blockList.appendChild(div);
    });

    if (ledger.chain.length > 0) {
      blockDetails.textContent = JSON.stringify(
        ledger.chain[ledger.chain.length - 1],
        null,
        2
      );
    }
  }

  function setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-link, .hero-actions .btn");
    navButtons.forEach((btn) => {
      const target = btn.getAttribute("data-section");
      if (!target) return;
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".mc-section")
          .forEach((s) => s.classList.remove("active"));
        document
          .querySelectorAll(".nav-link")
          .forEach((b) => b.classList.remove("active"));
        const section = document.getElementById(`section-${target}`);
        if (section) section.classList.add("active");
        const navBtn = document.querySelector(`.nav-link[data-section="${target}"]`);
        if (navBtn) navBtn.classList.add("active");
      });
    });
  }

  function setupEvents() {
    document
      .getElementById("shipmentForm")
      .addEventListener("submit", upsertShipment);
    document
      .getElementById("btnResetShipment")
      .addEventListener("click", resetShipmentForm);
    document
      .getElementById("btnNewShipment")
      .addEventListener("click", resetShipmentForm);
    document
      .getElementById("shipmentFilterStatus")
      .addEventListener("change", renderShipmentTable);

    document
      .getElementById("providerForm")
      .addEventListener("submit", upsertProvider);
    document
      .getElementById("btnResetProvider")
      .addEventListener("click", resetProviderForm);
    document
      .getElementById("btnNewProvider")
      .addEventListener("click", resetProviderForm);

    document.getElementById("bidForm").addEventListener("submit", upsertBid);

    document
      .getElementById("roleSelect")
      .addEventListener("change", () => renderAll());
  }

  function renderAll() {
    renderDashboard();
    renderShipmentTable();
    renderProviderTable();
    renderBiddingShipments();
    renderBidProviderOptions();
    renderBlockchain();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupNavigation();
    setupEvents();
    renderAll();
  });
})();

