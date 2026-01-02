import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://www.nexa-ai.dev',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 1,
        },
    ];
}
