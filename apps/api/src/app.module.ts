import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/infra/auth.module';
import { UsersModule } from './modules/users/infra/users.module';
import { ProjectsModule } from './modules/projects/infra/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CharterModule } from './modules/charter/charter.module';
import { WbsModule } from './modules/wbs/wbs.module';
import { RisksModule } from './modules/risks/risks.module';
import { StakeholdersModule } from './modules/stakeholders/stakeholders.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { PopsModule } from './modules/pops/pops.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TaxonomiesModule } from './modules/taxonomies/infra/taxonomies.module';
import { ContactsModule } from './modules/contacts/infra/contacts.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { CrmActivitiesModule } from './modules/crm-activities/crm-activities.module';
import { SearchModule } from './modules/search/search.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ProjectAccessGuard } from './common/guards/project-access.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Falha fechada: sem estas envs válidas, a aplicação recusa o startup em
      // vez de subir degradada (ex.: aceitando tokens forjados com um segredo
      // padrão). Ver docs/analise-seguranca.md S1/S2.
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        PORT: Joi.number().default(3001),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
      }),
      validationOptions: { abortEarly: false },
    }),
    // Rate limiting global — barra flood/scraping por IP. Rotas de auth têm
    // limite mais agressivo via @Throttle (ver auth.controller.ts).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CharterModule,
    WbsModule,
    RisksModule,
    StakeholdersModule,
    MilestonesModule,
    PopsModule,
    ActivitiesModule,
    OrganizationsModule,
    TaxonomiesModule,
    ContactsModule,
    PipelinesModule,
    OpportunitiesModule,
    InteractionsModule,
    CrmActivitiesModule,
    SearchModule,
  ],
  providers: [
    // ThrottlerGuard primeiro: rejeita excesso antes de gastar trabalho de auth/DB.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ProjectAccessGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
