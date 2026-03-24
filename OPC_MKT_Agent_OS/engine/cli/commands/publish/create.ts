import { register } from '../../registry.js';

register({
  module: 'publish',
  action: '创建发布',
  actionAlias: 'create',
  description: '创建发布任务',
  params: [
    { name: 'scriptId', type: 'string', required: true, description: '脚本ID' },
    { name: 'platform', type: 'string', required: false, description: '平台', default: 'xiaohongshu' },
    { name: 'scheduledAt', type: 'string', required: false, description: '定时发布时间' },
  ],
  endpoint: '/api/publish',
  method: 'POST',
  mapArgs: (args) => ({ body: { scriptId: args.scriptId, platform: args.platform || 'xiaohongshu', ...(args.scheduledAt ? { scheduledAt: args.scheduledAt } : {}) } }),
});
