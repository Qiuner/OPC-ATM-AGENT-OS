import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '竞品总结',
  actionAlias: 'summarize',
  description: '生成竞品分析总结报告',
  params: [
    { name: 'id', type: 'string', required: true, description: '竞品ID (comp_xxx)' },
  ],
  endpoint: '/api/competitors/summarize',
  method: 'POST',
  mapArgs: (args) => ({ body: { competitor_id: args.id } }),
});
