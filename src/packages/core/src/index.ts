export * from './nexa-config';
export * from './types';
export const safetyFilter = {
    validate: async (message: string) => {
        return { allowed: true, reason: null };
    }
};
