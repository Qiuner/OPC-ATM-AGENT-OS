import { register } from '../../registry.js';

register({
  module: 'materials',
  action: '创建素材',
  actionAlias: 'create',
  description: '创建新素材',
  params: [
    { name: 'title', type: 'string', required: true, description: '素材标题' },
    { name: 'content', type: 'string', required: true, description: '素材内容' },
    { name: 'type', type: 'string', required: false, description: '素材类型', default: 'text' },
  ],
  endpoint: '/api/materials',
  method: 'POST',
  mapArgs: (args) => ({ body: { title: args.title, content: args.content, type: args.type || 'text' } }),
});
