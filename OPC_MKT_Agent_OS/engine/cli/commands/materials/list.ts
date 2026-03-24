import { register } from '../../registry.js';

register({
  module: 'materials',
  action: '素材列表',
  actionAlias: 'list',
  description: '获取素材列表',
  params: [
    { name: 'page', type: 'number', required: false, description: '页码', default: 1 },
    { name: 'limit', type: 'number', required: false, description: '每页数量', default: 20 },
  ],
  endpoint: '/api/materials',
  method: 'GET',
  mapArgs: (args) => ({ query: { page: args.page || '1', limit: args.limit || '20' } }),
});
