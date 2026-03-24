import { register } from '../../registry.js';

register({
  module: 'materials',
  action: '搜索热门',
  actionAlias: 'search-trending',
  description: '搜索平台热门素材',
  params: [
    { name: 'keyword', type: 'string', required: false, description: '搜索关键词' },
    { name: 'platform', type: 'string', required: false, description: '平台', default: 'xiaohongshu' },
  ],
  endpoint: '/api/materials/trending',
  method: 'GET',
  mapArgs: (args) => ({ query: { ...(args.keyword ? { keyword: args.keyword } : {}), platform: args.platform || 'xiaohongshu' } }),
});
