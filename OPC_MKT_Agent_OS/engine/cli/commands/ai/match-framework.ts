import { register } from '../../registry.js';

register({
  module: 'ai',
  action: '匹配框架',
  actionAlias: 'match-framework',
  description: '为素材匹配最佳内容框架',
  params: [
    { name: 'materialId', type: 'string', required: true, description: '素材ID' },
  ],
  endpoint: '/api/ai/match-framework',
  method: 'POST',
  mapArgs: (args) => ({ body: { materialId: args.materialId } }),
});
