import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string> | undefined;
}

@Injectable()
export class ProxyService {
  private readonly userServiceUrl: string;
  private readonly discussionServiceUrl: string;
  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:3001',
    );
    this.discussionServiceUrl = this.configService.get<string>(
      'DISCUSSION_SERVICE_URL',
      'http://localhost:3007',
    );
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:3002');
  }

  async proxyToUserService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxy<T>(this.userServiceUrl, request);
  }

  async proxyToDiscussionService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxy<T>(this.discussionServiceUrl, request);
  }

  async proxyToAiService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
    return this.proxy<T>(this.aiServiceUrl, request);
  }

  private async proxy<T>(baseUrl: string, request: ProxyRequest): Promise<AxiosResponse<T>> {
    const url = `${baseUrl}${request.path}`;

    const config: AxiosRequestConfig = {
      method: request.method,
      url,
      data: request.body,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      params: request.query,
      // Don't throw on non-2xx status - let the gateway handle the response
      validateStatus: () => true,
    };

    // Remove undefined/null headers
    if (config.headers) {
      Object.keys(config.headers).forEach((key) => {
        if (config.headers![key] === undefined || config.headers![key] === null) {
          delete config.headers![key];
        }
      });
    }

    return firstValueFrom(this.httpService.request<T>(config));
  }
}
