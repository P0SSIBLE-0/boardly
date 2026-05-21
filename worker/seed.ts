/**
 * Seed script to create 2 test users using better-auth signup API.
 *
 * Usage:
 *   npm run seed
 *
 * Make sure your app is running:
 *   npm run dev
 *   npm run dev:worker
 */

const BASE_URL = "http://localhost:3000";

async function seed() {
  const users = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      password: "password123",
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      password: "password123",
    },
  ];

  console.log("Seeding users...\n");

  for (const userData of users) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": BASE_URL,
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log(`✓ Created: ${userData.name} (${userData.email})`);
      } else if (response.status === 400) {
        const body = await response.json() as { code?: string };
        if (body.code === "USER_ALREADY_EXISTS") {
          console.log(`- Exists: ${userData.email}`);
        } else {
          console.error(`✗ Failed: ${userData.email} - ${JSON.stringify(body)}`);
        }
      } else {
        const body = await response.json() as Record<string, unknown>;
        console.error(`✗ Failed: ${userData.email} - ${JSON.stringify(body)}`);
      }
    } catch (error) {
      console.error(`✗ Failed: ${userData.email} - ${error}`);
    }
  }

  console.log("\nDone! Test credentials:");
  console.log("  alice@example.com / password123");
  console.log("  bob@example.com / password123");
}

seed();
