import { register } from '../../registry.js';

register({
  module: 'ai',
  action: '质量检查',
  actionAlias: 'check-script',
  description: '对脚本进行质量检查',
  params: [
    { name: 'scriptId', type: 'string', required: true, description: '脚本ID' },
  ],
  endpoint: '/api/ai/check-script',
  method: 'POST',
  mapArgs: (args) => ({ body: { scriptId: args.scriptId } }),
});
