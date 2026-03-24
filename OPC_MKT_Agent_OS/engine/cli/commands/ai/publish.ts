import { register } from '../../registry.js';

register({
  module: 'ai',
  action: '生成发布文案',
  actionAlias: 'publish',
  description: '基于脚本生成平台发布文案',
  params: [
    { name: 'scriptId', type: 'string', required: true, description: '脚本ID' },
    { name: 'platform', type: 'string', required: false, description: '目标平台', default: 'xiaohongshu' },
  ],
  endpoint: '/api/ai/publish',
  method: 'POST',
  mapArgs: (args) => ({ body: { scriptId: args.scriptId, platform: args.platform || 'xiaohongshu' } }),
});
