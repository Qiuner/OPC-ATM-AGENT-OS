import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '爆款笔记',
  actionAlias: 'top-notes',
  description: '获取竞品爆款笔记排行',
  params: [
    { name: 'limit', type: 'number', required: false, description: '返回数量', default: 20 },
    { name: 'sort', type: 'string', required: false, description: '排序字段', default: 'likes' },
  ],
  endpoint: '/api/competitors/top-notes',
  method: 'GET',
  mapArgs: (args) => ({ query: { limit: args.limit || '20', sort: args.sort || 'likes' } }),
});
