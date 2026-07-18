import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ProjectAccessGuard },
  ],
})
export class AppModule {}
