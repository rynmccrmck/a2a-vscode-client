export class HttpClient {
    
    async fetch(url: string, options?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    }): Promise<string> {
        const https = require('https');
        const http = require('http');

        return new Promise((resolve, reject) => {
            const isHttps = url.startsWith('https:');
            const client = isHttps ? https : http;
            const urlObj = new URL(url);

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options?.method || 'GET',
                headers: options?.headers || {}
            };

            const req = client.request(requestOptions, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', reject);
            
            if (options?.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    async get(url: string, headers?: Record<string, string>): Promise<string> {
        return this.fetch(url, { method: 'GET', headers });
    }

    async post(url: string, body: any, headers?: Record<string, string>): Promise<string> {
        const defaultHeaders = { 'Content-Type': 'application/json' };
        const mergedHeaders = { ...defaultHeaders, ...headers };
        
        return this.fetch(url, {
            method: 'POST',
            headers: mergedHeaders,
            body: typeof body === 'string' ? body : JSON.stringify(body)
        });
    }

    async stream(url: string, options: { headers?: Record<string, string>; body?: string }, onEvent: (event: string) => void): Promise<void> {
        const https = require('https');
        const http = require('http');

        return new Promise((resolve, reject) => {
            const isHttps = url.startsWith('https:');
            const client = isHttps ? https : http;
            const urlObj = new URL(url);

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    ...options.headers
                }
            };

            const req = client.request(requestOptions, (res: any) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }

                res.setEncoding('utf8');
                let buffer = '';

                res.on('data', (chunk: string) => {
                    buffer += chunk;

                    const dataEvents = chunk.split('data: ').filter(part => part.trim());
                    
                    dataEvents.forEach(eventData => {
                        eventData = eventData.trim();
                        if (!eventData || eventData === '[DONE]') return;
                        
                        eventData = eventData.replace(/\s*data:\s*$/, '');
                        
                        if (eventData.startsWith('{') && eventData.includes('}')) {
                            const jsonMatch = eventData.match(/^(\{.*\})/);
                            if (jsonMatch) {
                                try {
                                    onEvent(jsonMatch[1]);
                                } catch (error) {
                                    console.error('Error in onEvent callback:', error);
                                }
                            }
                        }
                    });
                });

                res.on('end', () => {
                    if (buffer.trim()) {
                        try {
                            onEvent(buffer.trim());
                        } catch (error) {
                            console.error('Error processing final buffer:', error);
                        }
                    }
                    resolve();
                });

                res.on('error', reject);
            });

            req.on('error', reject);

            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    async tryMultipleUrls(urls: string[], options?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    }): Promise<{ url: string; response: string }> {
        let lastError: Error | null = null;

        for (const url of urls) {
            try {
                const response = await this.fetch(url, options);
                return { url, response };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                continue;
            }
        }

        throw lastError || new Error('All URLs failed');
    }
}