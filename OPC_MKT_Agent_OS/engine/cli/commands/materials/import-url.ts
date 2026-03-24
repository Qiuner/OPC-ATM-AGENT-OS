import { register } from '../../registry.js';

register({
  module: 'materials',
  action: '导入链接',
  actionAlias: 'import-url',
  description: '从链接导入素材',
  params: [
    { name: 'url', type: 'string', required: true, description: '要导入的链接' },
  ],
  endpoint: '/api/materials/import',
  method: 'POST',
  mapArgs: (args) => ({ body: { url: args.url } }),
});
