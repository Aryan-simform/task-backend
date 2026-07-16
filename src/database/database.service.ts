import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class DatabaseService {
    constructor(private readonly dataSource: DataSource) {}

    async transaction<T>(
        work: (manager: EntityManager) => Promise<T>,
    ): Promise<T> {
        return this.dataSource.transaction(work);
    }
}
