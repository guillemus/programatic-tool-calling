import { simpleImageEditorAgent } from '@/code-exec'

const tests = [
    // 1. Trivial - single shape
    { name: '01-red-circle', prompt: 'Red circle centered on canvas' },
    { name: '02-blue-rounded-square', prompt: 'Blue square with rounded corners, centered' },

    // 2. Basic - 2-3 shapes, single layer
    { name: '03-magnifying-glass', prompt: 'White magnifying glass icon on black background' },
    { name: '04-checkmark', prompt: 'Green checkmark inside a white circle' },

    // 3. Layered - requires .layer()
    {
        name: '05-notification-bell',
        prompt: 'Notification bell icon with red dot badge in top right',
    },
    { name: '06-play-button', prompt: 'Play button: white triangle inside a blue circle' },

    // 4. Multi-layer composition
    {
        name: '07-pill-capsule',
        prompt: 'Pill capsule, left half teal right half blue, with white highlight spot',
    },
    { name: '08-envelope', prompt: 'Envelope icon with folded flap (V shape on top)' },

    // 5. Text + shapes
    { name: '09-initials-badge', prompt: 'Purple circle with white initials "AB" centered' },
    { name: '10-notification-count', prompt: 'Red rounded rectangle badge with white text "99+"' },

    // 6. Complex paths
    { name: '11-bookmark', prompt: 'Bookmark icon using path() - rectangle with notch at bottom' },
    { name: '12-star', prompt: '5-pointed star shape, yellow fill' },

    // 7. Hard - multiple techniques
    {
        name: '13-gradient-icon',
        prompt: 'App icon: rounded square background transitioning from purple to pink, with white lightning bolt symbol',
    },
    {
        name: '14-chat-bubble',
        prompt: 'Chat bubble with tail pointing down-left, containing three gray typing dots',
    },
]

for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Running: ${test.name}`)
    console.log(`Prompt: ${test.prompt}`)
    console.log('='.repeat(60))

    await simpleImageEditorAgent(test.prompt, { name: test.name })
}

console.log('\nAll tests complete!')
