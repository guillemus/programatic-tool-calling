/**
 * Code Search API for exploring codebases.
 *
 * The `search` object is available in your code.
 * All methods are async, use await.
 * Your code should RETURN the data you want to receive as results.
 *
 * @example
 * ```javascript
 * // Find all TypeScript files in src
 * const files = await search.listFiles('src', '*.ts')
 *
 * // Search for function definitions (limit to 20 results)
 * const matches = await search.grep('function\\s+\\w+', 'src', { limit: 20 })
 *
 * // Read specific lines from a file
 * const content = await search.readFile('src/index.ts', { startLine: 10, maxLines: 50 })
 *
 * // Return what you want to see
 * return { files, matches }
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
     * @param options.limit - Max results (default: 50)
     * @returns Array of matches with file path, line number, and content
     */
    grep(
        pattern: string,
        path?: string,
        options?: { limit?: number },
    ): Promise<Array<{ file: string; line: number; content: string }>>

    /**
     * Read a file's contents with line numbers
     * @param path - File path relative to root
     * @param options.startLine - Start from this line (default: 1)
     * @param options.maxLines - Max lines to read (default: 200)
     * @returns File contents with line numbers
     */
    readFile(path: string, options?: { startLine?: number; maxLines?: number }): Promise<string>
}
