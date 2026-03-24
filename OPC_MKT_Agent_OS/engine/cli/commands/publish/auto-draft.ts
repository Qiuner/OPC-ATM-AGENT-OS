import { register } from '../../registry.js';

register({
  module: 'publish',
  action: '自动草稿',
  actionAlias: 'auto-draft',
  description: '从素材自动生成发布草稿',
  params: [
    { name: 'materialId', type: 'string', required: true, description: '素材ID' },
    { name: 'platform', type: 'string', required: false, description: '平台', default: 'xiaohongshu' },
  ],
  endpoint: '/api/publish/auto-draft',
  method: 'POST',
  mapArgs: (args) => ({ body: { materialId: args.materialId, platform: args.platform || 'xiaohongshu' } }),
});
