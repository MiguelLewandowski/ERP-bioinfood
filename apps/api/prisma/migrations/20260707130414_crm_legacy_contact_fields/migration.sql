-- AlterTable: paridade com os campos de contato/redes sociais do CRM anterior (Agendor)
ALTER TABLE "Organization" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "ramal" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "skype" TEXT,
ADD COLUMN     "instagram" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "ramal" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "skype" TEXT,
ADD COLUMN     "instagram" TEXT;
