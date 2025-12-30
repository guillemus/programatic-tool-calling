import { db } from '@/db'
import { generation, thread } from '@/schema'
import { eq } from 'drizzle-orm'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export interface GenerationData {
    id: string
    threadId: string
    parentId: string | null
    type: 'debug' | 'final'
    prompt: string
    code: string
    imageData: string
}

export interface Storage {
    updateThreadStatus(threadId: string, status: string): Promise<void>
    saveGeneration(data: GenerationData): Promise<void>
    markGenerationAsFinal(id: string): Promise<void>
}

export class DbStorage implements Storage {
    async updateThreadStatus(threadId: string, status: string) {
        await db.update(thread).set({ status }).where(eq(thread.id, threadId))
    }

    async saveGeneration(data: GenerationData) {
        await db.insert(generation).values(data)
    }

    async markGenerationAsFinal(id: string) {
        await db.update(generation).set({ type: 'final' }).where(eq(generation.id, id))
    }
}

export class FileStorage implements Storage {
    private outputDir: string
    private stepCount = 0

    constructor(outputDir = './output') {
        this.outputDir = outputDir
    }

    async updateThreadStatus(_threadId: string, status: string) {
        console.log(`[file-storage] status: ${status}`)
    }

    async saveGeneration(data: GenerationData) {
        await mkdir(this.outputDir, { recursive: true })
        this.stepCount++

        const imgPath = join(this.outputDir, `step-${this.stepCount}.png`)
        const codePath = join(this.outputDir, `step-${this.stepCount}.js`)

        await writeFile(imgPath, Buffer.from(data.imageData, 'base64'))
        await writeFile(codePath, data.code)

        console.log(`[file-storage] saved: ${imgPath}`)
    }

    async markGenerationAsFinal(id: string) {
        // Copy last step as final
        console.log(`[file-storage] final generation: ${id}`)
    }
}
