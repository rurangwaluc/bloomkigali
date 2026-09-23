import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bloom Kigali',
    short_name: 'Bloom Kigali',
    description:
      'Internal business management system for Bloom Kigali.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F1F1F1',
    theme_color: '#BF9A2F',
    categories: ['business', 'productivity'],
  };
}
