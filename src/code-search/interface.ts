/**
 * Code Search API for exploring codebases.
 *
 * The `search` object is available in your code.
 * All methods are async, use await.
 *
 * @example
 * ```javascript
 * // Find all TypeScript files in src
 * const files = await search.listFiles('src', '*.ts')
 *
 * // Search for function definitions
 * const matches = await search.grep('function\\s+\\w+', 'src')
 *
 * // Read a specific file
 * const content = await search.readFile('src/index.ts')
 * ```
 */
export interface CodeSearch {
    /**
     * List files matching a glob pattern
     * @param path - Directory to search in (relative to root)
     * @param pattern - Glob pattern (e.g. '*.ts', '**\/*.md')
     * @returns Array of file paths relative to root
     */
    listFiles(path: string, pattern: string): Promise<string[]>

    /**
     * Search file contents using regex
     * @param pattern - Regex pattern to search for
     * @param path - Directory to search in (relative to root)
     * @returns Array of matches with file path, line number, and content
     */
    grep(
        pattern: string,
        path?: string,
    ): Promise<Array<{ file: string; line: number; content: string }>>

    /**
     * Read a file's contents
     * @param path - File path relative to root
     * @returns File contents as string
     */
    readFile(path: string): Promise<string>
}
