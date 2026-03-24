import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '竞品列表',
  actionAlias: 'list',
  description: '获取所有竞品列表',
  params: [],
  endpoint: '/api/competitors',
  method: 'GET',
  mapArgs: () => ({}),
});
