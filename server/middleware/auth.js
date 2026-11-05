import { getAuth, createClerkClient } from "@clerk/express";
import { prisma } from "../db.js";

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const clerkClient = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey, publishableKey: clerkPublishableKey })
  : null;

/**
 * Middleware to resolve and attach the internal PostgreSQL User record to the request.
 * Automatically provisions the user via JIT upsert on their first authenticated request.
 */
export async function attachUserContext(req, res, next) {
  let clerkUserId = null;
  let displayName = "Student";
  let emailAddress = null;

  // 1. Hermetic test authentication mode
  const isTestMode = process.env.NODE_ENV === "test" || process.execArgv.includes("--test");
  if (isTestMode) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer test_user_")) {
      clerkUserId = authHeader.replace("Bearer ", "").trim();
      displayName = `Test User ${clerkUserId.replace("test_user_", "")}`;
      emailAddress = `${clerkUserId}@test.local`;
    }
  }

  // 2. Standard Clerk authentication (when Clerk secret key is configured)
  if (!clerkUserId && clerkSecretKey) {
    try {
      const auth = getAuth(req);
      if (auth?.userId) {
        clerkUserId = auth.userId;
        if (auth.sessionClaims?.name) displayName = String(auth.sessionClaims.name).trim();
        if (auth.sessionClaims?.email) emailAddress = String(auth.sessionClaims.email).trim().toLowerCase();
      }
    } catch (e) {
      // Token verification failed or unauthenticated
    }
  }

  if (!clerkUserId) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  try {
    // 1. Fast lookup by Clerk User ID
    let user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    // 2. Just-in-time provisioning if user does not exist in PostgreSQL
    if (!user) {
      // Fall back to Clerk Backend API if claims lack email/name and secret key is provided
      if (clerkClient && (!emailAddress || displayName === "Student")) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
            || clerkUser.username
            || displayName;
          emailAddress = clerkUser.emailAddresses?.[0]?.emailAddress || emailAddress;
        } catch (apiError) {
          console.warn(`[Auth] Could not fetch profile from Clerk API for ${clerkUserId}:`, apiError.message);
        }
      }

      // Concurrency-safe atomic upsert
      user = await prisma.user.upsert({
        where: { clerkUserId },
        update: {},
        create: {
          clerkUserId,
          name: displayName,
          email: emailAddress,
          timezone: "UTC",
          weeklyAvailability: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          schedulerSettings: { minSession: 0.5, maxPerTaskPerDay: 3, bufferDays: 0, earlyStartShare: 0 },
        },
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error("[Auth] User context establishment failed:", error);
    return res.status(500).json({
      error: "Failed to establish user identity context",
      code: "INTERNAL_DATABASE_ERROR",
    });
  }
}
