import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '添加竞品',
  actionAlias: 'add',
  description: '添加新的竞品账号',
  params: [
    { name: 'url', type: 'string', required: true, description: '竞品账号链接' },
    { name: 'name', type: 'string', required: false, description: '竞品名称' },
  ],
  endpoint: '/api/competitors',
  method: 'POST',
  mapArgs: (args) => ({ body: { url: args.url, name: args.name } }),
});
