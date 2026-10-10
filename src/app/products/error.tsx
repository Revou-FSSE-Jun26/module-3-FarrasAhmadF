"use client"

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
    return (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-center">
            <p className="font-semibold text-red-700">Something went wrong</p>
            <p className="text-sm text-red-600 mt-1">Unable to load products. please try again.</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{error.message}</p>
            <button
                onClick={() => reset()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
                Try again
            </button>
        </div>
    );
}