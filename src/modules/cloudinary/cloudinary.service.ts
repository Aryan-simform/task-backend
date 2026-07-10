import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
    constructor(private readonly configService: ConfigService) {}
    onModuleInit(): void {
        cloudinary.config({
            cloud_name: this.configService.getOrThrow<string>(
                'cloudinary.cloudName',
            ),
            api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
            api_secret: this.configService.getOrThrow<string>(
                'cloudinary.apiSecret',
            ),
        });
    }

    generateSignedUploadParams(
        params: Record<string, string | number | boolean>,
    ): {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        notificationUrl: string;
    } {
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = { ...params, timestamp };
        const apiSecret = this.configService.getOrThrow<string>(
            'cloudinary.apiSecret',
        );
        const signature: string = cloudinary.utils.api_sign_request(
            paramsToSign,
            apiSecret,
        );
        const notificationUrl: string = this.configService.getOrThrow<string>(
            'cloudinary.notificationUrl',
        );

        return {
            signature,
            timestamp,
            apiKey: this.configService.getOrThrow<string>('cloudinary.apiKey'),
            cloudName: this.configService.getOrThrow<string>(
                'cloudinary.cloudName',
            ),
            notificationUrl,
        };
    }

    verifyWebhookSignature(
        rawBody: string,
        timestamp: string,
        signature: string,
    ): boolean {
        return cloudinary.utils.verifyNotificationSignature(
            rawBody,
            Number(timestamp),
            signature,
        );
    }
}
