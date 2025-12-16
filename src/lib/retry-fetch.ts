/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retry attempts
 * @param delay Initial delay in milliseconds
 * @returns Promise with the result
 */
export async function retryFetch<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        if (retries === 0) {
            throw error
        }
        console.log(`Retrying... ${retries} attempts left`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return retryFetch(fn, retries - 1, delay * 2) // Exponential backoff
    }
}

/**
 * Timeout wrapper for promises
 * @param promise Promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
    ])
}
