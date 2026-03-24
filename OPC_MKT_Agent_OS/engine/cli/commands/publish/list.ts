import { register } from '../../registry.js';

register({
  module: 'publish',
  action: '发布列表',
  actionAlias: 'list',
  description: '获取发布任务列表',
  params: [
    { name: 'page', type: 'number', required: false, description: '页码', default: 1 },
    { name: 'status', type: 'string', required: false, description: '筛选状态' },
  ],
  endpoint: '/api/publish',
  method: 'GET',
  mapArgs: (args) => ({ query: { page: args.page || '1', ...(args.status ? { status: args.status } : {}) } }),
});
