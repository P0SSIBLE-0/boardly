/**
 * PBKDF2-based password hashing for Cloudflare Workers.
 *
 * Bcrypt / scrypt exceed the free-tier Workers CPU limit (10 ms).
 * PBKDF2 via the Web Crypto API is hardware-accelerated and does
 * NOT count against the CPU budget, making it safe to use here.
 *
 * We use 600 000 iterations of PBKDF2-SHA-256 with a 16-byte random
 * salt. Output is stored as   salt:hash   (both hex-encoded).
 */

const ITERATIONS = 100_000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH_BITS = 256; // 32 bytes

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: ArrayBuffer,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveKey(password, salt.buffer);
  return `${bufToHex(salt.buffer)}:${bufToHex(derived)}`;
}

export async function verifyPassword({
  password,
  hash,
}: {
  password: string;
  hash: string;
}): Promise<boolean> {
  const [saltHex, storedHashHex] = hash.split(":");

  if (!saltHex || !storedHashHex) {
    return false;
  }

  const salt = hexToBuf(saltHex);
  const derived = await deriveKey(password, salt);
  return bufToHex(derived) === storedHashHex;
}
