import { Command } from 'commander'
import { NexaNode } from './index'
import { logger } from '@/lib/nexa-core/logger'

export class CLI {
    constructor(private client: NexaNode) { }

    initialize(program: Command) {
        program
            .name('nexa')
            .description('Nexa AI Command Line Interface')
            .version('1.0.0')

        // Chat command
        program
            .command('chat')
            .description('Interactive chat with Nexa AI')
            .option('-m, --model <model>', 'Model to use', 'llama3')
            .action(async (options: { model: string }) => {
                await this.chatMode(options.model)
            })

        // Embed command
        program
            .command('embed <file>')
            .description('Generate embeddings for a file')
            .option('-o, --output <file>', 'Output file')
            .action(async (file: string, options: { output?: string }) => {
                await this.embedFile(file, options.output)
            })

        // Process directory
        program
            .command('process <directory>')
            .description('Process directory for RAG indexing')
            .option('-c, --collection <name>', 'Collection name')
            .action(async (directory: string, options: { collection?: string }) => {
                await this.processDirectory(directory, options.collection)
            })

        return program
    }

    private async chatMode(model: string) {
        logger.info('🚀 Nexa AI Interactive Chat', 'CLI')
        logger.info(`Model: ${model}`, 'CLI')
        logger.info('Type "quit" to exit', 'CLI')

        // Simple readline
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        })

        const question = (prompt: string): Promise<string> =>
            new Promise(resolve => readline.question(prompt, resolve))

        try {
            while (true) {
                const input = await question('You: ')

                if (input.toLowerCase() === 'quit') {
                    break
                }

                logger.info('Thinking...', 'CLI')

                try {
                    const response = await this.client.chat.send({
                        messages: [{ role: 'user', content: input }],
                        modelId: model
                    })

                    logger.info(`Nexa: ${response.message.content}`, 'CLI')
                } catch (error) {
                    logger.error('Chat error', 'CLI', error instanceof Error ? error.message : String(error))
                }
            }
        } finally {
            readline.close()
        }
    }

    private async embedFile(inputFile: string, outputFile?: string) {
        logger.info(`Processing ${inputFile}...`, 'CLI')

        try {
            const content = await this.client.files.read(inputFile)
            const embeddings = await this.client.embeddings.create(content)

            if (outputFile) {
                await this.client.files.write(outputFile, JSON.stringify(embeddings, null, 2))
                logger.info(`Embeddings saved to ${outputFile}`, 'CLI')
            } else {
                logger.info('Embeddings generated', 'CLI')
                logger.info(JSON.stringify(embeddings, null, 2), 'CLI')
            }
        } catch (error) {
            logger.error('Embedding error', 'CLI', error instanceof Error ? error.message : String(error))
        }
    }

    private async processDirectory(directory: string, collectionName?: string) {
        logger.info(`Processing directory ${directory}...`, 'CLI')

        try {
            const result = await this.client.processDirectory(directory)

            logger.info(`Processed ${result.processed} files`, 'CLI')

            if (collectionName) {
                logger.info('Creating RAG index...', 'CLI')

                const index = await this.client.createRAGIndex(
                    result.results.map((r: { embeddings: { text: string }; metadata: Record<string, unknown> }) => ({
                        content: r.embeddings.text, // Simplified
                        metadata: r.metadata
                    })),
                    { collectionName }
                )

                logger.info(`Index created: ${index.collectionId}`, 'CLI')
            }
        } catch (error) {
            logger.error('Processing error', 'CLI', error instanceof Error ? error.message : String(error))
        }
    }
}
