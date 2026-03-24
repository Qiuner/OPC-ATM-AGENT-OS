import { register } from '../../registry.js';

register({
  module: 'ai',
  action: '优化脚本',
  actionAlias: 'optimize-script',
  description: '优化脚本内容，可指定失败规则',
  params: [
    { name: 'scriptId', type: 'string', required: true, description: '脚本ID' },
    { name: 'rules', type: 'string', required: false, description: '失败的规则，逗号分隔' },
  ],
  endpoint: '/api/ai/optimize-script',
  method: 'POST',
  mapArgs: (args) => ({ body: { scriptId: args.scriptId, ...(args.rules ? { failedRules: args.rules.split(',') } : {}) } }),
});
