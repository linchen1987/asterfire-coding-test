import { Module, OnModuleInit } from '@nestjs/common';
import { getDb, closeDb } from './connection';
import { initTables } from './init';
import { seedDefaultJob } from './seed';

@Module({
  providers: [
    {
      provide: 'DATABASE',
      useFactory: () => getDb(),
    },
  ],
  exports: ['DATABASE'],
})
export class DbModule implements OnModuleInit {
  onModuleInit() {
    initTables();
    seedDefaultJob();
  }

  onModuleDestroy() {
    closeDb();
  }
}
