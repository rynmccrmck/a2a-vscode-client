import * as vscode from 'vscode';
import { ChatProvider } from './ChatProvider';
import { A2AService } from './A2AService';
import { HttpClient } from './HttpClient';

const outputChannel = vscode.window.createOutputChannel('A2A Chat');

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    outputChannel.appendLine(logMessage);
    
    if (level === 'ERROR') {
        console.error(logMessage);
    } else if (level === 'WARN') {
        console.warn(logMessage);
    } else {
        console.log(logMessage);
    }
}

export function activate(context: vscode.ExtensionContext) {
    log('A2A Chat extension is now active!');
    outputChannel.show(true);

    const httpClient = new HttpClient();
    const a2aService = new A2AService(httpClient, log);
    const chatProvider = new ChatProvider(context.extensionUri, a2aService, log);

    // Register webview provider with correct ID from package.json
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('a2a-vscode-client.chatView', chatProvider)
    );

    // Register commands with correct IDs from package.json
    const openChatCommand = vscode.commands.registerCommand('a2a-vscode-client.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.a2a-vscode-client');
    });

    const viewAgentCardCommand = vscode.commands.registerCommand('a2a-vscode-client.viewAgentCard', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter agent URL',
            placeHolder: 'http://localhost:41241'
        });
        
        if (url) {
            const panel = vscode.window.createWebviewPanel(
                'a2aAgentCard',
                'A2A Agent Card',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            panel.webview.html = `
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <h1>Agent Card Viewer</h1>
                        <p>Loading agent card from: ${url}</p>
                        <iframe src="${url}/.well-known/agent.json" 
                                style="width: 100%; height: 80vh; border: 1px solid #ccc;">
                        </iframe>
                    </body>
                </html>
            `;
        }
    });

    context.subscriptions.push(openChatCommand, viewAgentCardCommand);
}

export function deactivate() {
    log('A2A Chat extension deactivated');
    outputChannel.dispose();
}