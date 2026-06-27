import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  database: {
    db: new Pool({ connectionString: process.env.DATABASE_URL }),
    type: "pg",
  },
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
})
