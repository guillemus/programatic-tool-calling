import fs from 'fs/promises'
import { glob } from 'glob'
import path from 'path'
import type { CodeSearch } from './interface'

export interface SearchResult {
    answer: string
    filesRead: string[]
    searchesPerformed: number
}

/**
 * Execute search code against a codebase.
 * Returns structured results from the search.
 */
export async function executeCode(code: string, rootDir: string): Promise<SearchResult> {
    const filesRead: string[] = []
    let searchesPerformed = 0

    const search: CodeSearch = {
        listFiles: async (searchPath, pattern) => {
            searchesPerformed++
            const fullPath = path.join(rootDir, searchPath)
            const matches = await glob(pattern, { cwd: fullPath, nodir: true })
            return matches.map((m) => path.join(searchPath, m))
        },

        grep: async (pattern, searchPath = '.') => {
            searchesPerformed++
            const fullPath = path.join(rootDir, searchPath)
            const regex = new RegExp(pattern, 'g')
            const results: Array<{ file: string; line: number; content: string }> = []

            async function searchDir(dir: string): Promise<void> {
                const entries = await fs.readdir(dir, { withFileTypes: true })
                for (const entry of entries) {
                    const entryPath = path.join(dir, entry.name)
                    if (entry.isDirectory()) {
                        if (
                            !entry.name.startsWith('.') &&
                            entry.name !== 'node_modules' &&
                            entry.name !== 'dist'
                        ) {
                            await searchDir(entryPath)
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
                                }
                                regex.lastIndex = 0
                            }
                        } catch {
                            // skip binary files
                        }
                    }
                }
            }

            await searchDir(fullPath)
            return results
        },

        readFile: async (filePath) => {
            const fullPath = path.join(rootDir, filePath)
            const content = await fs.readFile(fullPath, 'utf-8')
            filesRead.push(filePath)
            return content
        },
    }

    let answer = ''
    const searchWithReturn = {
        ...search,
        setAnswer: (value: string) => {
            answer = value
        },
    }

    const asyncFn = new Function('search', `return (async () => { ${code} })()`)
    await asyncFn(searchWithReturn)

    return { answer, filesRead, searchesPerformed }
}

export async function getInterface(): Promise<string> {
    const filePath = new URL('./interface.ts', import.meta.url).pathname
    const content = await fs.readFile(filePath, 'utf-8')
    return content
}
