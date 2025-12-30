import { db } from '@/db'
import { generation } from '@/schema'
import { mkdir, writeFile } from 'fs/promises'
import { nanoid } from 'nanoid'
import { join } from 'path'

export interface GenerationResult {
    code: string
    imageData: string
}

export interface Storage {
    save(threadId: string, result: GenerationResult): Promise<void>
}

export class DbStorage implements Storage {
    async save(threadId: string, result: GenerationResult) {
        await db.insert(generation).values({
            id: nanoid(),
            threadId,
            code: result.code,
            imageData: result.imageData,
        })
    }
}

export class FileStorage implements Storage {
    private outputDir: string

    constructor(outputDir = './output') {
        this.outputDir = outputDir
    }

    async save(_threadId: string, result: GenerationResult) {
        await mkdir(this.outputDir, { recursive: true })

        const imgPath = join(this.outputDir, 'output.png')
        const codePath = join(this.outputDir, 'output.js')

        await writeFile(imgPath, Buffer.from(result.imageData, 'base64'))
        await writeFile(codePath, result.code)

        console.log(`Saved: ${imgPath}`)
    }
}
