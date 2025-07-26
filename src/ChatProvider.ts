import * as vscode from 'vscode';
import { A2AService } from './A2AService';

export class ChatProvider implements vscode.WebviewViewProvider {
    private a2aService: A2AService;
    private logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR') => void;

    constructor(
        private readonly extensionUri: vscode.Uri,
        a2aService: A2AService,
        logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR') => void
    ) {
        this.a2aService = a2aService;
        this.logger = logger;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken,
    ) {
        this.logger('Resolving A2A Chat webview');

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getWebviewHtml();

        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.handleWebviewMessage(webviewView, message);
        });
    }

    private async handleWebviewMessage(webviewView: vscode.WebviewView, message: any) {
        try {
            switch (message.type) {
                case 'checkAgent':
                    await this.handleCheckAgent(webviewView, message.url);
                    break;
                case 'sendMessage':
                    await this.handleSendMessage(webviewView, message.url, message.message, message.useStreaming, message.taskId, message.contextId);
                    break;
                default:
                    this.logger(`Unknown message type: ${message.type}`, 'WARN');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger(`Error handling webview message: ${errorMsg}`, 'ERROR');
            
            webviewView.webview.postMessage({
                type: 'error',
                error: errorMsg
            });
        }
    }

    private async handleCheckAgent(webviewView: vscode.WebviewView, agentUrl: string) {
        try {
            const agentCard = await this.a2aService.checkAgent(agentUrl);

            webviewView.webview.postMessage({
                type: 'agentChecked',
                success: true,
                agent: agentCard
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            webviewView.webview.postMessage({
                type: 'agentChecked',
                success: false,
                error: errorMsg
            });
        }
    }

    private async handleSendMessage(
        webviewView: vscode.WebviewView, 
        agentUrl: string, 
        messageText: string, 
        useStreaming: boolean = false,
        taskId?: string,
        contextId?: string
    ) {
        try {
            if (useStreaming) {
                this.logger('Starting streaming message...');
                
                await this.a2aService.sendMessage(agentUrl, messageText, true, taskId, contextId, (chunk) => {
                    this.logger(`Forwarding stream chunk to UI: ${JSON.stringify(chunk)}`);
                    
                    webviewView.webview.postMessage({
                        type: 'messageResponse',
                        success: true,
                        streaming: true,
                        data: chunk
                    });
                });

                webviewView.webview.postMessage({
                    type: 'streamComplete',
                    success: true
                });

                this.logger('Streaming completed');
                return;
            }

            this.logger('Sending non-streaming message...');
            const result = await this.a2aService.sendMessage(agentUrl, messageText, false, taskId, contextId);
            
            webviewView.webview.postMessage({
                type: 'messageResponse',
                success: !result.error,
                data: result,
                streaming: false
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger(`Message sending failed: ${errorMsg}`, 'ERROR');
            
            webviewView.webview.postMessage({
                type: 'messageResponse',
                success: false,
                error: errorMsg,
                streaming: useStreaming
            });
        }
    }

    private getWebviewHtml(): string {
        const fs = require('fs');
        const path = require('path');
        
        const templatePath = path.join(__dirname, '..', 'src', 'templates', 'chat.html');
        
        try {
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            this.logger(`Could not load template file: ${error}`, 'WARN');
            return this.getFallbackHtml();
        }
    }

    private getFallbackHtml(): string {
        return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>A2A Chat Error</title>
    </head>
    <body>
        <h2>Template Loading Error</h2>
        <p>Could not load chat.html template.</p>
    </body>
    </html>`;
    }
}