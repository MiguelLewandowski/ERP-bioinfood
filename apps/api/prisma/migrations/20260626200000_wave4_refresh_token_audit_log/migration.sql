-- Wave 4: refresh token rotation + audit log
-- RefreshToken: tracks issued refresh tokens for rotation and revocation
-- AuditLog: immutable trail of mutations (actor, entity, before/after)

CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "jti"       TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id"        TEXT NOT NULL,
    "actorId"   TEXT,
    "action"    TEXT NOT NULL,
    "entity"    TEXT NOT NULL,
    "entityId"  TEXT NOT NULL,
    "before"    JSONB,
    "after"     JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_jti_idx" ON "RefreshToken"("jti");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
