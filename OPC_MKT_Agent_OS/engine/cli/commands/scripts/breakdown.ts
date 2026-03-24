import { register } from '../../registry.js';

register({
  module: 'scripts',
  action: '脚本拆解',
  actionAlias: 'breakdown',
  description: '将脚本拆解为分镜/段落',
  params: [
    { name: 'scriptId', type: 'string', required: true, description: '脚本ID' },
  ],
  endpoint: '/api/scripts/breakdown',
  method: 'POST',
  mapArgs: (args) => ({ body: { scriptId: args.scriptId } }),
});
