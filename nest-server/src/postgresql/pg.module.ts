import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { pgProviderByDrizzle } from './pg-provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [pgProviderByDrizzle],
  exports: [pgProviderByDrizzle],
})
export class PgModule {}
