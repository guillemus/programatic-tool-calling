import { imageEditorAgent } from '@/code-exec'
import { FileStorage } from '@/storage'

const PROMPT = 'Generate a pelican riding a bicycle'

async function main() {
    console.log(`Prompt: "${PROMPT}"`)

    await imageEditorAgent(PROMPT, {
        threadId: 'cli',
        storage: new FileStorage('./output'),
    })

    console.log('Done.')
}

main().catch(console.error)
