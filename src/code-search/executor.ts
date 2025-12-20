import fs from 'fs/promises'
import { glob } from 'glob'
import path from 'path'
import type { CodeSearch } from './interface'

export interface SearchResult {
    result: unknown
    metadata: {
        filesRead: string[]
        searchesPerformed: number
    }
}

export async function executeCode(code: string, rootDir: string): Promise<SearchResult> {
    const filesRead: string[] = []
    let searchesPerformed = 0

    const search: CodeSearch = {
        listFiles: async (searchPath, pattern) => {
            searchesPerformed++
            const fullPath = path.join(rootDir, searchPath)
            const matches = await glob(pattern, { cwd: fullPath, nodir: true })
            const result = matches.map((m) => path.join(searchPath, m))
            return result
        },

        grep: async (pattern, searchPath = '.', options = {}) => {
            searchesPerformed++
            const limit = options.limit ?? 50
            const fullPath = path.join(rootDir, searchPath)
            const regex = new RegExp(pattern, 'g')
            const results: Array<{ file: string; line: number; content: string }> = []

            async function searchDir(dir: string): Promise<boolean> {
                if (results.length >= limit) return true
                const entries = await fs.readdir(dir, { withFileTypes: true })
                for (const entry of entries) {
                    if (results.length >= limit) return true
                    const entryPath = path.join(dir, entry.name)
                    if (entry.isDirectory()) {
                        if (
                            !entry.name.startsWith('.') &&
                            entry.name !== 'node_modules' &&
                            entry.name !== 'dist'
                        ) {
                            const done = await searchDir(entryPath)
                            if (done) return true
                        }
                    } else if (entry.isFile()) {
                        try {
                            const content = await fs.readFile(entryPath, 'utf-8')
                            const lines = content.split('\n')
                            for (let i = 0; i < lines.length; i++) {
                                if (regex.test(lines[i])) {
                                    results.push({
                                        file: path.relative(rootDir, entryPath),
                                        line: i + 1,
                                        content: lines[i].trim(),
                                    })
                                    if (results.length >= limit) return true
                                }
                                regex.lastIndex = 0
                            }
                        } catch {
                            // skip binary files
                        }
                    }
                }
                return false
            }

            await searchDir(fullPath)
            return results
        },

        readFile: async (filePath, options = {}) => {
            const fullPath = path.join(rootDir, filePath)
            const content = await fs.readFile(fullPath, 'utf-8')
            filesRead.push(filePath)

            const lines = content.split('\n')
            const startLine = options.startLine ?? 1
            const maxLines = options.maxLines ?? 200
            const endLine = Math.min(startLine + maxLines - 1, lines.length)

            const selectedLines = lines.slice(startLine - 1, endLine)
            const numbered = selectedLines.map((line, i) => `${startLine + i}: ${line}`).join('\n')
            const result =
                lines.length > endLine
                    ? numbered + `\n... (${lines.length - endLine} more lines)`
                    : numbered

            return result
        },
    }

    const asyncFn = new Function('search', `return (async () => { ${code} })()`)
    const result = await asyncFn(search)

    return {
        result,
        metadata: { filesRead, searchesPerformed },
    }
}

export async function getInterface(): Promise<string> {
    const filePath = new URL('./interface.ts', import.meta.url).pathname
    const content = await fs.readFile(filePath, 'utf-8')
    return content
}
