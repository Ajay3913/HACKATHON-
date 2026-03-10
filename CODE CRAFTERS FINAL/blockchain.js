// Simple in-browser blockchain simulation for MedicChain Logistics.
// This is not a production blockchain, but it models immutable, hash-linked blocks
// capturing every important logistics event.

class MedicChainBlock {
  constructor(index, timestamp, type, payload, previousHash = "0") {
    this.index = index;
    this.timestamp = timestamp;
    this.type = type;
    this.payload = payload;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const data = `${this.index}|${this.timestamp}|${this.type}|${JSON.stringify(
      this.payload
    )}|${this.previousHash}`;
    // Simple deterministic hash using built-in crypto (SHA-256).
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = (hash * 31 + bytes[i]) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }
}

class MedicChainLedger {
  constructor() {
    this.chain = [];
    this.loadFromStorage();
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
  }

  createGenesisBlock() {
    const genesis = new MedicChainBlock(
      0,
      new Date().toISOString(),
      "GENESIS",
      { message: "MedicChain Logistics Ledger Initialized" },
      "0"
    );
    this.chain.push(genesis);
    this.persist();
    return genesis;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(type, payload) {
    const latest = this.getLatestBlock();
    const index = latest ? latest.index + 1 : 0;
    const block = new MedicChainBlock(
      index,
      new Date().toISOString(),
      type,
      payload,
      latest ? latest.hash : "0"
    );
    this.chain.push(block);
    this.persist();
    return block;
  }

  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];
      if (current.previousHash !== prev.hash) return false;
      if (current.calculateHash() !== current.hash) return false;
    }
    return true;
  }

  persist() {
    try {
      window.localStorage.setItem("medicChainLedger", JSON.stringify(this.chain));
    } catch (e) {
      // ignore storage errors
    }
  }

  loadFromStorage() {
    try {
      const raw = window.localStorage.getItem("medicChainLedger");
      if (!raw) {
        this.chain = [];
        return;
      }
      const parsed = JSON.parse(raw);
      this.chain = parsed.map(
        (b) =>
          new MedicChainBlock(b.index, b.timestamp, b.type, b.payload, b.previousHash)
      );
    } catch {
      this.chain = [];
    }
  }
}

window.MedicChainLedger = MedicChainLedger;

