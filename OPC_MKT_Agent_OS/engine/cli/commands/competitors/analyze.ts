import { register } from '../../registry.js';

register({
  module: 'competitors',
  action: '竞品分析',
  actionAlias: 'analyze',
  description: '分析指定竞品笔记',
  params: [
    { name: 'id', type: 'string', required: true, description: '竞品笔记ID (cnote_xxx)' },
    { name: 'transcribe', type: 'boolean', required: false, description: '是否转录视频', default: false },
  ],
  endpoint: '/api/competitors/analyze',
  method: 'POST',
  mapArgs: (args) => ({ body: { note_id: args.id, transcribe: args.transcribe === 'true' } }),
});
