import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '竞品同步',
  actionAlias: 'sync',
  description: '同步竞品数据，不指定ID则同步全部',
  params: [
    { name: 'id', type: 'string', required: false, description: '指定竞品ID，不填则同步全部' },
  ],
  endpoint: '/api/competitors/sync',
  method: 'POST',
  mapArgs: (args) => ({ body: args.id ? { competitor_id: args.id } : {} }),
});
