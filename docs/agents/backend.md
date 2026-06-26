# Specialist: Backend

## Structure
actions/      → entry point
services/     → business logic
repositories/ → database

## Rules
- Every action: check auth first
- Input: validate with Zod
- Return: { data, error }
- Log critical operations
- No logic in components
- English: variables, functions, files, comments
- Indentation: 2 spaces, functions max 20 lines

## Server Action pattern

```ts
"use server"
import { auth } from "@/lib/auth"
import { z } from "zod"

const schema = z.object({ name: z.string().min(1) })

export async function createItem(input: unknown) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // business logic here
}
```