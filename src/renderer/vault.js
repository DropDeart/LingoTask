// Optional per-profile password.
//
// The password is not a gate that the app checks and could be bypassed by editing a file: it is
// the key. A locked profile's saved state is encrypted with AES-GCM under a key derived from the
// password with PBKDF2, so without the password the file is ciphertext to everyone, including
// this app. The trade is that a forgotten password means the profile is gone, which is why
// setting one asks for confirmation in those words.
//
// The password itself is never stored anywhere, and the derived key lives only in memory for as
// long as the profile is open.

const Vault = {
  ITERATIONS: 210000, // OWASP guidance for PBKDF2-HMAC-SHA256
  key: null, // CryptoKey for the profile currently open
  salt: null, // its salt, kept so saves can re-encrypt without the password

  // crypto.subtle needs a secure context: https, or http://localhost. Serving the web build over
  // plain http on a LAN address leaves it undefined, so the feature is offered only when usable.
  available() {
    return typeof crypto !== 'undefined' && !!crypto.subtle;
  },

  b64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  },
  bytes(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  },

  async deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  },

  isEncrypted(blob) {
    return !!blob && blob.enc === 1;
  },

  // Holds the key for this session so every later save can re-encrypt silently.
  async unlock(blob, password) {
    const salt = this.bytes(blob.salt);
    const key = await this.deriveKey(password, salt);
    const iv = this.bytes(blob.iv);
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, this.bytes(blob.ct));
    } catch {
      // AES-GCM authenticates: a wrong password cannot produce plausible output, it just fails
      throw new Error('wrong-password');
    }
    this.key = key;
    this.salt = salt;
    return JSON.parse(new TextDecoder().decode(plain));
  },

  // Decrypt with the key already held, without asking for the password again.
  async open(blob) {
    if (!this.key) throw new Error('locked');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.bytes(blob.iv) }, this.key, this.bytes(blob.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  },

  async setPassword(password) {
    this.salt = crypto.getRandomValues(new Uint8Array(16));
    this.key = await this.deriveKey(password, this.salt);
  },

  clear() {
    this.key = null;
    this.salt = null;
  },

  async seal(state) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(JSON.stringify(state)));
    return { enc: 1, v: 1, salt: this.b64(this.salt), iv: this.b64(iv), ct: this.b64(ct) };
  },
};
