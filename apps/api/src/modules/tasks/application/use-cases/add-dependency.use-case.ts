import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskDependencyType } from '@prisma/client';
import { ITaskRepository, TASK_REPOSITORY } from '../../domain/tasks.repository.interface';

@Injectable()
export class AddDependencyUseCase {
  constructor(@Inject(TASK_REPOSITORY) private repo: ITaskRepository) {}

  async execute(
    projectId: string,
    successorId: string,
    predecessorId: string,
    type: TaskDependencyType = TaskDependencyType.FS,
    lag = 0,
  ) {
    const [successor, predecessor] = await Promise.all([
      this.repo.findById(successorId),
      this.repo.findById(predecessorId),
    ]);

    if (!successor || successor.projectId !== projectId) throw new NotFoundException('Task not found');
    if (!predecessor || predecessor.projectId !== projectId) throw new NotFoundException('Predecessor task not found');
    if (successorId === predecessorId) throw new BadRequestException('Task cannot depend on itself');

    const hasCycle = await this.detectCycle(projectId, predecessorId, successorId);
    if (hasCycle) throw new BadRequestException('Dependency would create a cycle');

    return this.repo.addDependency(predecessorId, successorId, type, lag);
  }

  private async detectCycle(projectId: string, startId: string, targetId: string): Promise<boolean> {
    const allDeps = await this.repo.findAllDependenciesByProject(projectId);
    const graph = new Map<string, string[]>();

    for (const dep of allDeps) {
      if (!graph.has(dep.predecessorId)) graph.set(dep.predecessorId, []);
      graph.get(dep.predecessorId)!.push(dep.successorId);
    }

    // Check if targetId can reach startId (would create cycle after adding startId→targetId)
    const visited = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === startId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = graph.get(current) ?? [];
      queue.push(...neighbors);
    }

    return false;
  }
}
