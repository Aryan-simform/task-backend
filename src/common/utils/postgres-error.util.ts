export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

export function getPgErrorCode(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'code' in err) {
        return (err as { code?: string }).code;
    }
    return undefined;
}
