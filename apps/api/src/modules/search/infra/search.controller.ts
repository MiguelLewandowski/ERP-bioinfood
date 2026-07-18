import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GlobalSearchUseCase } from '../application/global-search.use-case';
import { AuthUser } from '../domain/search.types';

// Busca global do command palette (⌘K). Qualquer usuário autenticado pode
// buscar — o escopo por papel (CLIENTE só vê seus projetos) fica no use case.
@Controller('search')
export class SearchController {
  constructor(private globalSearch: GlobalSearchUseCase) {}

  @Get()
  search(@Query('q') q = '', @CurrentUser() user: AuthUser) {
    return this.globalSearch.execute(user, q);
  }
}
