# Specialist: Database

## Rules
- Every model: id (cuid), createdAt, updatedAt
- Soft delete with deletedAt
- Index on filter/search fields
- Never without limit: always { take: N }
- Names: English, singular, camelCase

## Before migration
1. npx prisma validate
2. Review the SQL
3. Test on dev