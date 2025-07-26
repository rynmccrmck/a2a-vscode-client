import { HttpClient } from './HttpClient';

export class A2AService {
    private httpClient: HttpClient;
    private logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR') => void;

    constructor(
        httpClient: HttpClient, 
        logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR') => void
    ) {
        this.httpClient = httpClient;
        this.logger = logger;
    }

    public async checkAgent(agentUrl: string): Promise<any> {
        this.logger(`Checking agent at: ${agentUrl}`);
        
        const cardUrl = agentUrl.endsWith('/') ? 
            `${agentUrl}.well-known/agent.json` : 
            `${agentUrl}/.well-known/agent.json`;

        this.logger(`Fetching agent card from: ${cardUrl}`);
        
        try {
            const response = await this.httpClient.get(cardUrl);
            const agentCard = JSON.parse(response);
            
            this.logger(`Successfully connected to agent: ${agentCard.name} v${agentCard.version}`);
            return agentCard;
            
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger(`Failed to check agent: ${errorMsg}`, 'ERROR');
            throw error;
        }
    }

    public async sendMessage(
        agentUrl: string, 
        messageText: string, 
        useStreaming: boolean = false,
        taskId?: string,
        contextId?: string,
        onStream?: (data: any) => void
    ): Promise<any> {
        this.logger(`Sending message: "${messageText}" (streaming: ${useStreaming}, taskId: ${taskId || 'new'})`);
        
        const message: any = {
            kind: "message",
            role: "user",
            messageId: `msg-${Date.now()}`,
            parts: [{ kind: "text", text: messageText }]
        };

        if (taskId) {
            message.taskId = taskId;
            this.logger(`Including taskId in message: ${taskId}`);
        }
        if (contextId) {
            message.contextId = contextId;
            this.logger(`Including contextId in message: ${contextId}`);
        }

        const request = {
            id: `req-${Date.now()}`,
            jsonrpc: "2.0",
            method: useStreaming ? "message/stream" : "message/send",
            params: {
                message,
                metadata: { clientId: "vscode-client" }
            }
        };

        if (useStreaming && onStream) {
            this.logger('Starting streaming request...');
            
            try {
                let eventCount = 0;
                await this.httpClient.stream(
                    agentUrl,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'text/event-stream'
                        },
                        body: JSON.stringify(request)
                    },
                    (eventData) => {
                        eventCount++;
                        this.logger(`Stream event ${eventCount}: ${eventData}`);
                        
                        try {
                            const parsed = JSON.parse(eventData);
                            
                            if (parsed.result?.kind === 'status-update') {
                                const status = parsed.result.status;
                                const message = status.message;
                                
                                const statusInfo = {
                                    state: status.state,
                                    timestamp: status.timestamp,
                                    final: parsed.result.final,
                                    taskId: parsed.result.taskId,
                                    contextId: parsed.result.contextId
                                };
                                
                                if (message?.parts) {
                                    const textParts = message.parts
                                        .filter((p: any) => p.kind === 'text')
                                        .map((p: any) => p.text);
                                    
                                    if (textParts.length > 0) {
                                        onStream({
                                            text: textParts.join(''),
                                            status: statusInfo,
                                            messageId: message.messageId,
                                            role: message.role
                                        });
                                    }
                                } else {
                                    onStream({
                                        text: '',
                                        status: statusInfo,
                                        statusOnly: true
                                    });
                                }
                            } else {
                                this.logger(`Unknown event format: ${JSON.stringify(parsed)}`, 'WARN');
                            }
                        } catch (parseError) {
                            this.logger(`Failed to parse stream data: ${parseError}`, 'ERROR');
                            onStream({ text: eventData, error: true });
                        }
                    }
                );
                
                this.logger(`Streaming completed successfully. Total events processed: ${eventCount}`);
                return { success: true };
                
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                this.logger(`Streaming failed: ${errorMsg}`, 'ERROR');
                throw error;
            }
        }

        const endpoint = agentUrl.endsWith('/') ? agentUrl : agentUrl + '/';
        
        try {
            const { response } = await this.httpClient.tryMultipleUrls([endpoint], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(request)
            });

            return JSON.parse(response);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger(`Non-streaming request failed: ${errorMsg}`, 'ERROR');
            throw error;
        }
    }
}