import { register } from '../../registry.js';

register({
  module: 'ai',
  action: '生成脚本',
  actionAlias: 'generate',
  description: '基于素材AI生成脚本',
  params: [
    { name: 'materialId', type: 'string', required: true, description: '素材ID' },
    { name: 'framework', type: 'string', required: false, description: '内容框架' },
  ],
  endpoint: '/api/ai/generate',
  method: 'POST',
  mapArgs: (args) => ({ body: { materialId: args.materialId, ...(args.framework ? { framework: args.framework } : {}) } }),
});
