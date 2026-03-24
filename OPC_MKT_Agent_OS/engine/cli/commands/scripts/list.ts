import { register } from '../../registry.js';

register({
  module: 'scripts',
  action: '脚本列表',
  actionAlias: 'list',
  description: '获取脚本列表',
  params: [
    { name: 'page', type: 'number', required: false, description: '页码', default: 1 },
    { name: 'limit', type: 'number', required: false, description: '每页数量', default: 20 },
    { name: 'status', type: 'string', required: false, description: '筛选状态' },
  ],
  endpoint: '/api/scripts',
  method: 'GET',
  mapArgs: (args) => ({ query: { page: args.page || '1', limit: args.limit || '20', ...(args.status ? { status: args.status } : {}) } }),
});
