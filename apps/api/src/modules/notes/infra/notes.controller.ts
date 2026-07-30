import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ManageNotesUseCase } from '../application/manage-notes.use-case';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { toNoteDto, toNoteListItemDto } from './note.mapper';

/**
 * Anotações pessoais — ÚNICA exceção de privacidade do ERP.
 *
 * ## Por que não há `@Roles()` nem `RolesGuard` aqui
 *
 * Papel não decide nada nesta rota: todo usuário autenticado tem as próprias
 * anotações, inclusive CLIENTE. O `JwtAuthGuard` global já garante que há um
 * usuário; é tudo que precisa ser verificado sobre papel.
 *
 * ## Por que ADMIN não lê a nota dos outros
 *
 * Porque **não existe o caminho**. `user.id` vem do JWT e é o único `ownerId`
 * que chega ao repositório — não há parâmetro de rota, de query ou de corpo que
 * permita pedir a nota de outra pessoa. ADMIN chamando `GET /notes` recebe as
 * notas dele, pelo mesmo código que todo mundo.
 *
 * Isso NÃO contraria o "ADMIN sempre passa no RolesGuard": o guard governa
 * papel, e aqui a trava é de posse, que é filtro de dado. São camadas
 * diferentes. Mexer no RolesGuard para criar exceção afetaria todos os outros
 * módulos — por isso a garantia foi construída aqui, e não lá.
 *
 * ⚠️ Qualquer endpoint futuro que aceite um `ownerId` vindo de fora quebra
 * a garantia inteira.
 */
@Controller('notes')
export class NotesController {
  constructor(private notes: ManageNotesUseCase) {}

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    const rows = await this.notes.list(user.id);
    return rows.map(toNoteListItemDto);
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return toNoteDto(await this.notes.get(user.id, id));
  }

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateNoteDto) {
    return toNoteDto(await this.notes.create(user.id, dto));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return toNoteDto(await this.notes.update(user.id, id, dto));
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notes.remove(user.id, id);
  }
}
