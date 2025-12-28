import { simpleImageEditorAgent } from '@/code-exec'

const prompts = [
    {
        name: 'pelican-simple',
        prompt: 'Generate an image of a pelican riding a bicycle',
    },
    {
        name: 'pelican-advanced',
        prompt: 'Generate an image of a California brown pelican riding a bicycle. The bicycle must have spokes and a correctly shaped bicycle frame. The pelican must have its characteristic large pouch, and there should be a clear indication of feathers.  The pelican must be clearly pedaling the bicycle. The image should show the full breeding plumage of the California brown pelican.',
    },
]

for (const test of prompts) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Running: ${test.name}`)
    console.log(`Prompt: ${test.prompt}`)
    console.log('='.repeat(60))

    await simpleImageEditorAgent(test.prompt, { name: test.name })
}
