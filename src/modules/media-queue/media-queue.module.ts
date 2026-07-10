import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UserModule } from '../user/user.module';
import { MediaProcessor } from './processors/media.processor';
import { MEDIA_QUEUE } from './media-queue.constants';

export { MEDIA_QUEUE } from './media-queue.constants';

@Module({
    imports: [BullModule.registerQueueAsync({ name: MEDIA_QUEUE }), UserModule],
    providers: [MediaProcessor],
    exports: [BullModule],
})
export class MediaQueueModule {}
