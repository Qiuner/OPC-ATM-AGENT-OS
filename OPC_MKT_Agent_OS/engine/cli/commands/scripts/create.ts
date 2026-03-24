import { register } from '../../registry.js';

register({
  module: 'scripts',
  action: '创建脚本',
  actionAlias: 'create',
  description: '创建新脚本',
  params: [
    { name: 'title', type: 'string', required: true, description: '脚本标题' },
    { name: 'content', type: 'string', required: true, description: '脚本内容' },
    { name: 'materialId', type: 'string', required: false, description: '关联素材ID' },
  ],
  endpoint: '/api/scripts',
  method: 'POST',
  mapArgs: (args) => ({ body: { title: args.title, content: args.content, ...(args.materialId ? { materialId: args.materialId } : {}) } }),
});
